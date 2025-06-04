import { formatINR } from './formatting';
import { roundHalfUp, toDisplayString } from './numberUtils';

// Fallback formatting function in case of import issues
const safeFormatINR = (val) => {
  try {
    return formatINR(val);
  } catch (error) {
    console.error('Error formatting INR:', error);
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  }
};

export const printDailySummary = (date, shiftsOnDate) => {
  // Debug logging
  console.log('🖨️ Print function called with:', { date, shiftsCount: shiftsOnDate?.length });
  console.log('📊 Shifts data:', shiftsOnDate);

  if (!shiftsOnDate || shiftsOnDate.length === 0) {
    alert('No shift data available to print.');
    return;
  }

  // Calculate daily aggregates
  const dailyFuelRevenue = shiftsOnDate.reduce((tot, sh) => {
    const shiftFuel = sh.readings.reduce((s, r) => {
      const rate = roundHalfUp(sh.dayRate?.[r.fuelType] || 0, 2);
      return s + roundHalfUp((r.closing - r.opening) * rate, 2);
    }, 0);

    const calibrationCost = (sh.nozzleTesting || []).reduce((s, t) => {
      const rate = roundHalfUp(sh.dayRate?.[t.fuelType] || 0, 2);
      const quantity = roundHalfUp(t.quantity || 0, 2);
      return s + roundHalfUp(quantity * rate, 2);
    }, 0);

    return tot + roundHalfUp(shiftFuel - calibrationCost, 2);
  }, 0);

  const dailyCreditAmt = shiftsOnDate.reduce((tot, sh) => {
    return tot + (sh.creditSales?.reduce((t, d) => t + (+d.amount || 0), 0) || +sh.sales?.deferralTotal || 0);
  }, 0);

  const dailyCreditBackAmt = shiftsOnDate.reduce((tot, sh) => {
    return tot + (sh.creditBack?.reduce((t, p) => t + (+p.amount || 0), 0) || +sh.sales?.advancePaymentTotal || 0);
  }, 0);

  const dailyCreditSalesCount = shiftsOnDate.reduce((tot, sh) => tot + (sh.creditSales?.length || 0), 0);
  const dailyCreditBackCount = shiftsOnDate.reduce((tot, sh) => tot + (sh.creditBack?.length || 0), 0);

  const dailyQR = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.qrTransfer || 0, 2), 0);
  const dailyCard = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.card || 0, 2), 0);
  const dailyCheques = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.cheques || 0, 2), 0);
  const dailyManagerCash = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.cashWithManager || 0, 2), 0);
  const dailyCashInHand = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.cashInHand || 0, 2), 0);
  const dailyLube = shiftsOnDate.reduce((tot, sh) =>
    tot + (sh.lubeSales?.reduce((s, l) => s + roundHalfUp(Number(l.amount || 0), 2), 0) || 0), 0);
  const dailyLost = shiftsOnDate.reduce((tot, sh) => tot + roundHalfUp(sh.sales?.lost || 0, 2), 0);

  const fuelLitres = shiftsOnDate.reduce((tot, sh) =>
    tot + sh.readings.reduce((s, r) => s + roundHalfUp(r.closing - r.opening, 2), 0), 0);

  const dailyCalibrationFuel = shiftsOnDate.reduce((tot, sh) =>
    tot + (sh.nozzleTesting || []).reduce((s, t) => s + roundHalfUp(Number(t.quantity || 0), 2), 0), 0);

  // Calculate net fuel amounts by type
  const fuelTypeAmounts = {};
  shiftsOnDate.forEach(sh => {
    sh.readings.forEach(r => {
      const fuelType = r.fuelType;
      const volume = roundHalfUp(r.closing - r.opening, 2);
      if (!fuelTypeAmounts[fuelType]) {
        fuelTypeAmounts[fuelType] = { gross: 0, calibration: 0, net: 0 };
      }
      fuelTypeAmounts[fuelType].gross += volume;
    });

    // Subtract calibration/testing amounts
    (sh.nozzleTesting || []).forEach(t => {
      const fuelType = t.fuelType;
      const quantity = roundHalfUp(Number(t.quantity || 0), 2);
      if (!fuelTypeAmounts[fuelType]) {
        fuelTypeAmounts[fuelType] = { gross: 0, calibration: 0, net: 0 };
      }
      fuelTypeAmounts[fuelType].calibration += quantity;
    });
  });

  // Calculate net amounts
  Object.keys(fuelTypeAmounts).forEach(fuelType => {
    fuelTypeAmounts[fuelType].net = roundHalfUp(fuelTypeAmounts[fuelType].gross - fuelTypeAmounts[fuelType].calibration, 2);
  });

  const dailyTTS = roundHalfUp(dailyFuelRevenue + dailyLube + dailyCreditBackAmt, 2);
  const dailyCalculatedCashInHand = dailyTTS - dailyQR - dailyCard - dailyCheques - dailyManagerCash - dailyCreditAmt - dailyLost;
  const dailyTotalCash = dailyManagerCash + dailyCalculatedCashInHand;

  // Get all unique fuel types and their rates
  const allDayRates = {};
  shiftsOnDate.forEach(sh => {
    if (sh.dayRate) {
      Object.entries(sh.dayRate).forEach(([fuelType, rate]) => {
        if (!allDayRates[fuelType] || allDayRates[fuelType] !== rate) {
          allDayRates[fuelType] = rate;
        }
      });
    }
  });

  // Aggregate lube sales details
  const allLubeSales = shiftsOnDate.flatMap(sh =>
    (sh.lubeSales || []).map(lube => ({
      ...lube,
      shiftWorker: sh.submittedByName,
      timeType: sh.timeType
    }))
  );

  // Aggregate nozzle testing details
  const allNozzleTesting = shiftsOnDate.flatMap(sh =>
    (sh.nozzleTesting || []).map(test => ({
      ...test,
      shiftWorker: sh.submittedByName,
      timeType: sh.timeType,
      rate: sh.dayRate?.[test.fuelType] || 0,
      cost: (sh.dayRate?.[test.fuelType] || 0) * (test.quantity || 0)
    }))
  );

  // Format date for display
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  // Generate HTML content
  const printContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Daily Summary - ${formattedDate}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 10px;
          color: #333;
          line-height: 1.2;
          font-size: 11px;
        }
        .header {
          text-align: center;
          margin-bottom: 15px;
          border-bottom: 1px solid #333;
          padding-bottom: 8px;
        }
        .header h1 {
          margin: 0;
          font-size: 18px;
          font-weight: bold;
        }
        .header h2 {
          margin: 2px 0 0 0;
          font-size: 14px;
          color: #666;
        }
        .header h3 {
          margin: 2px 0 0 0;
          font-size: 12px;
          color: #666;
        }
        .header p {
          margin: 2px 0;
          font-size: 9px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 15px;
        }
        .summary-section {
          border: 1px solid #ddd;
          padding: 6px;
          border-radius: 3px;
          background: #fafafa;
        }
        .summary-section h3 {
          margin: 0 0 6px 0;
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 1px solid #eee;
          padding-bottom: 2px;
          font-weight: bold;
        }
        .summary-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }
        .summary-item:last-child {
          margin-bottom: 0;
        }
        .summary-label {
          font-size: 10px;
          color: #666;
        }
        .summary-value {
          font-weight: bold;
          font-size: 11px;
        }
        .rates-section {
          margin-bottom: 10px;
          border: 1px solid #ddd;
          padding: 6px;
          border-radius: 3px;
          background: #f9f9f9;
        }
        .rates-section h3 {
          margin: 0 0 6px 0;
          font-size: 12px;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 2px;
        }
        .rates-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 4px;
        }
        .rate-item {
          text-align: center;
          padding: 4px;
          background: white;
          border: 1px solid #eee;
          border-radius: 2px;
        }
        .fuel-type {
          font-weight: bold;
          font-size: 10px;
          color: #333;
        }
        .rate-value {
          font-size: 11px;
          color: #0066cc;
          font-weight: bold;
        }
        .details-section {
          margin-bottom: 15px;
        }
        .details-section h3 {
          margin: 0 0 8px 0;
          font-size: 13px;
          color: #333;
          border-bottom: 1px solid #333;
          padding-bottom: 2px;
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
          margin-bottom: 10px;
        }
        .fuel-breakdown-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: 6px;
          margin-bottom: 10px;
        }
        .detail-card {
          border: 1px solid #ddd;
          padding: 6px;
          border-radius: 3px;
          background: #fafafa;
        }
        .detail-card h4 {
          margin: 0 0 4px 0;
          font-size: 11px;
          color: #666;
          text-transform: uppercase;
          border-bottom: 1px solid #eee;
          padding-bottom: 2px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          font-size: 10px;
        }
        .detail-item:last-child {
          margin-bottom: 0;
        }
        .shifts-section {
          margin-top: 15px;
        }
        .shifts-section h2 {
          border-bottom: 1px solid #333;
          padding-bottom: 4px;
          margin-bottom: 10px;
          font-size: 14px;
        }
        .shift-card {
          border: 1px solid #ddd;
          margin-bottom: 8px;
          padding: 6px;
          border-radius: 3px;
          page-break-inside: avoid;
          background: white;
        }
        .shift-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          border-bottom: 1px solid #eee;
          padding-bottom: 4px;
        }
        .shift-title {
          font-weight: bold;
          font-size: 12px;
        }
        .shift-type {
          background: #f0f0f0;
          padding: 2px 4px;
          border-radius: 2px;
          font-size: 9px;
          font-weight: bold;
        }
        .shift-details {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
        }
        .detail-group h4 {
          margin: 0 0 4px 0;
          font-size: 11px;
          color: #666;
          font-weight: bold;
        }
        .readings-table, .lube-table, .testing-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 4px;
          font-size: 9px;
        }
        .readings-table th, .readings-table td,
        .lube-table th, .lube-table td,
        .testing-table th, .testing-table td {
          border: 1px solid #ddd;
          padding: 2px 3px;
          text-align: left;
        }
        .readings-table th, .lube-table th, .testing-table th {
          background: #f5f5f5;
          font-weight: bold;
        }
        .credit-transactions {
          margin-top: 6px;
        }
        .credit-list {
          font-size: 9px;
          margin-top: 2px;
        }
        .credit-item {
          margin-bottom: 1px;
          padding: 1px;
          background: #f9f9f9;
          border-left: 2px solid #0066cc;
          padding-left: 4px;
        }
        @media print {
          @page {
            size: A4;
            margin: 0.2in;
          }
          body { 
            margin: 0; 
            font-size: 10px;
            line-height: 1.1;
            max-width: 100%;
          }
          .header {
            margin-bottom: 8px;
            padding-bottom: 4px;
          }
          .header h1 {
            font-size: 16px;
            margin: 0;
          }
          .header h2 {
            font-size: 13px;
            margin: 1px 0;
          }
          .header p {
            font-size: 8px;
            margin: 1px 0;
          }
          .rates-section {
            margin-bottom: 6px;
            padding: 4px;
          }
          .rates-section h3 {
            font-size: 11px;
            margin-bottom: 3px;
          }
          .rate-item {
            padding: 3px;
          }
          .fuel-type {
            font-size: 9px;
          }
          .rate-value {
            font-size: 10px;
          }
          .details-section {
            margin-bottom: 8px;
          }
          .details-section h3 {
            font-size: 12px;
            margin-bottom: 4px;
          }
          .summary-grid { 
            grid-template-columns: repeat(4, 1fr);
            gap: 4px;
            margin-bottom: 8px;
          }
          .summary-section {
            padding: 4px;
          }
          .summary-section h3 {
            font-size: 10px;
            margin-bottom: 3px;
          }
          .summary-item {
            margin-bottom: 1px;
          }
          .summary-label {
            font-size: 9px;
          }
          .summary-value {
            font-size: 10px;
          }
          .shift-details { 
            grid-template-columns: repeat(3, 1fr);
            gap: 4px;
          }
          .detail-group h4 {
            font-size: 10px;
            margin-bottom: 2px;
          }
          .detail-item {
            font-size: 9px;
            margin-bottom: 1px;
          }
          .rates-grid { 
            grid-template-columns: repeat(auto-fit, minmax(70px, 1fr));
            gap: 3px;
          }
          .fuel-breakdown-grid { 
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 4px;
          }
          .detail-card {
            padding: 4px;
          }
          .detail-card h4 {
            font-size: 10px;
            margin-bottom: 2px;
          }
          .shifts-section {
            margin-top: 8px;
          }
          .shifts-section h2 {
            font-size: 13px;
            margin-bottom: 6px;
            padding-bottom: 2px;
          }
          .shift-card {
            margin-bottom: 4px;
            padding: 4px;
            page-break-inside: avoid;
          }
          .shift-header {
            margin-bottom: 3px;
            padding-bottom: 2px;
          }
          .shift-title {
            font-size: 11px;
          }
          .shift-type {
            font-size: 8px;
            padding: 1px 3px;
          }
          .readings-table, .lube-table, .testing-table {
            font-size: 8px;
            margin-top: 2px;
          }
          .readings-table th, .readings-table td,
          .lube-table th, .lube-table td,
          .testing-table th, .testing-table td {
            padding: 1px 2px;
          }
          .credit-transactions {
            margin-top: 3px;
          }
          .credit-transactions h4 {
            font-size: 9px;
            margin-bottom: 1px;
          }
          .credit-list {
            font-size: 8px;
          }
          .credit-item {
            margin-bottom: 0px;
            padding: 1px;
            padding-left: 3px;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Petrol Pump Daily Summary</h1>
        <h2>${formattedDate}</h2>
        <p>Generated on ${new Date().toLocaleString()}</p>
      </div>

      <!-- Day Rates Section -->
      <div class="rates-section">
        <h3>Day Rates</h3>
        <div class="rates-grid">
          ${Object.entries(allDayRates).map(([fuelType, rate]) => `
            <div class="rate-item">
              <div class="fuel-type">${fuelType}</div>
              <div class="rate-value">₹${toDisplayString(rate)}/L</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Fuel Type Breakdown Section -->
      <div class="details-section">
        <h3>Fuel Sales Breakdown by Type</h3>
        <div class="fuel-breakdown-grid">
          ${Object.entries(fuelTypeAmounts).map(([fuelType, amounts]) => `
            <div class="detail-card">
              <h4>${fuelType} Fuel</h4>
              <div class="detail-item">
                <span>Gross Sales:</span>
                <span>${toDisplayString(amounts.gross)} L</span>
              </div>
              <div class="detail-item">
                <span>Calibration/Testing:</span>
                <span>${toDisplayString(amounts.calibration)} L</span>
              </div>
              <div class="detail-item">
                <span><strong>Net Sales:</strong></span>
                <span><strong>${toDisplayString(amounts.net)} L</strong></span>
              </div>
              <div class="detail-item">
                <span>Rate:</span>
                <span>₹${toDisplayString(allDayRates[fuelType] || 0)}/L</span>
              </div>
              <div class="detail-item">
                <span><strong>Net Revenue:</strong></span>
                <span><strong>${toDisplayString(safeFormatINR(amounts.net * (allDayRates[fuelType] || 0)))}</strong></span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="summary-grid">
        <div class="summary-section">
          <h3>Revenue</h3>
          <div class="summary-item">
            <span class="summary-label">TTS (Total Theoretical Sale)</span>
            <span class="summary-value">${toDisplayString(dailyTTS)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Fuel Revenue</span>
            <span class="summary-value">${toDisplayString(dailyFuelRevenue)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Lube Sales</span>
            <span class="summary-value">${toDisplayString(dailyLube)}</span>
          </div>
        </div>

        <div class="summary-section">
          <h3>Cash Flow</h3>
          <div class="summary-item">
            <span class="summary-label">Total Cash</span>
            <span class="summary-value">${toDisplayString(dailyTotalCash)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Manager Cash</span>
            <span class="summary-value">${toDisplayString(dailyManagerCash)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cash in Hand (Calculated)</span>
            <span class="summary-value">${toDisplayString(dailyCalculatedCashInHand)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cash in Hand (Reported)</span>
            <span class="summary-value">${toDisplayString(dailyCashInHand)}</span>
          </div>
        </div>

        <div class="summary-section">
          <h3>Digital Payments</h3>
          <div class="summary-item">
            <span class="summary-label">QR Transfer</span>
            <span class="summary-value">${toDisplayString(dailyQR)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Card Payments</span>
            <span class="summary-value">${toDisplayString(dailyCard)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Cheques</span>
            <span class="summary-value">${toDisplayString(dailyCheques)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Lost/Stolen</span>
            <span class="summary-value">${toDisplayString(dailyLost)}</span>
          </div>
        </div>

        <div class="summary-section">
          <h3>Operations & Credit</h3>
          <div class="summary-item">
            <span class="summary-label">Total Fuel Sold (Net)</span>
            <span class="summary-value">${toDisplayString(Object.values(fuelTypeAmounts).reduce((sum, amounts) => sum + amounts.net, 0))} L</span>
          </div>
          ${Object.entries(fuelTypeAmounts).map(([fuelType, amounts]) => `
            <div class="summary-item">
              <span class="summary-label">${fuelType} (Net)</span>
              <span class="summary-value">${toDisplayString(amounts.net)} L</span>
            </div>
          `).join('')}
          <div class="summary-item">
            <span class="summary-label">Calibration/Testing</span>
            <span class="summary-value">${toDisplayString(dailyCalibrationFuel)} L</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Credit Sales (${dailyCreditSalesCount} orders)</span>
            <span class="summary-value">${toDisplayString(dailyCreditAmt)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Credit Back (${dailyCreditBackCount} payments)</span>
            <span class="summary-value">${toDisplayString(dailyCreditBackAmt)}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total Shifts</span>
            <span class="summary-value">${shiftsOnDate.length}</span>
          </div>
        </div>
      </div>

      <!-- Detailed Breakdowns -->
      ${allLubeSales.length > 0 ? `
        <div class="details-section">
          <h3>Lube/Mobil Sales Details</h3>
          <table class="lube-table">
            <thead>
              <tr>
                <th>Shift Worker</th>
                <th>Time</th>
                <th>Description</th>
                <th>Quantity (L)</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${allLubeSales.map(lube => `
                <tr>
                  <td>${lube.shiftWorker}</td>
                  <td>${lube.timeType}</td>
                  <td>${lube.description}</td>
                  <td>${toDisplayString(Number(lube.quantity || 0))}</td>
                  <td>${toDisplayString(lube.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      ${allNozzleTesting.length > 0 ? `
        <div class="details-section">
          <h3>Nozzle Testing/Calibration Details</h3>
          <table class="testing-table">
            <thead>
              <tr>
                <th>Shift Worker</th>
                <th>Time</th>
                <th>Fuel Type</th>
                <th>Quantity (L)</th>
                <th>Rate (₹/L)</th>
                <th>Cost</th>
              </tr>
            </thead>
            <tbody>
              ${allNozzleTesting.map(test => `
                <tr>
                  <td>${test.shiftWorker}</td>
                  <td>${test.timeType}</td>
                  <td>${test.fuelType}</td>
                  <td>${toDisplayString(Number(test.quantity || 0))}</td>
                  <td>${toDisplayString(Number(test.rate))}/L</td>
                  <td>${toDisplayString(test.cost)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}

      <div class="shifts-section">
        <h2>Individual Shift Details</h2>
        ${shiftsOnDate.map((shift) => {
    const fuelRev = shift.readings.reduce((s, r) => {
      const rate = +shift.dayRate?.[r.fuelType] || 0;
      return s + (r.closing - r.opening) * rate;
    }, 0);

    const calibrationCost = (shift.nozzleTesting || []).reduce((s, t) => {
      const rate = +shift.dayRate?.[t.fuelType] || 0;
      const quantity = +t.quantity || 0;
      return s + (quantity * rate);
    }, 0);

    const adjustedFuelRev = fuelRev - calibrationCost;
    const shiftLubeSales = shift.lubeSales?.reduce((sum, l) => sum + (Number(l.amount) || 0), 0) || 0;
    const creditBackAmt = shift.creditBack?.reduce((t, p) => t + (+p.amount || 0), 0) || 0;
    const shiftTTS = adjustedFuelRev + shiftLubeSales + creditBackAmt;
    const fuelSoldL = shift.readings.reduce((s, r) => s + (r.closing - r.opening), 0);
    const calibrationFuelL = (shift.nozzleTesting || []).reduce((s, t) => s + Number(t.quantity || 0), 0);

    const creditSalesAmt = shift.creditSales?.reduce((t, d) => t + (+d.amount || 0), 0) || 0;

    return `
            <div class="shift-card">
              <div class="shift-header">
                <div class="shift-title">${shift.user?.stationName || 'Unknown Station'} - ${shift.submittedByName}</div>
                <div class="shift-type">${shift.timeType} Shift</div>
              </div>
              
              <div class="shift-details">
                <div class="detail-group">
                  <h4>Revenue</h4>
                  <div class="detail-item">
                    <span>TTS:</span>
                    <span>${safeFormatINR(shiftTTS)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Fuel Revenue:</span>
                    <span>${safeFormatINR(adjustedFuelRev)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Lube Sales:</span>
                    <span>${safeFormatINR(shiftLubeSales)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Calibration Cost:</span>
                    <span>${safeFormatINR(calibrationCost)}</span>
                  </div>
                </div>

                <div class="detail-group">
                  <h4>Payments</h4>
                  <div class="detail-item">
                    <span>QR Transfer:</span>
                    <span>${safeFormatINR(shift.sales?.qrTransfer || 0)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Card:</span>
                    <span>${safeFormatINR(shift.sales?.card || 0)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Cheques:</span>
                    <span>${safeFormatINR(shift.sales?.cheques || 0)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Manager Cash:</span>
                    <span>${safeFormatINR(shift.sales?.cashWithManager || 0)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Cash in Hand:</span>
                    <span>${safeFormatINR(shift.sales?.cashInHand || 0)}</span>
                  </div>
                  <div class="detail-item">
                    <span>Lost/Stolen:</span>
                    <span>${safeFormatINR(shift.sales?.lost || 0)}</span>
                  </div>
                </div>

                <div class="detail-group">
                  <h4>Operations</h4>
                  <div class="detail-item">
                    <span>Fuel Sold:</span>
                    <span>${fuelSoldL.toFixed(2)} L</span>
                  </div>
                  <div class="detail-item">
                    <span>Calibration:</span>
                    <span>${calibrationFuelL.toFixed(2)} L</span>
                  </div>
                  <div class="detail-item">
                    <span>Credit Sales:</span>
                    <span>${safeFormatINR(creditSalesAmt)} (${shift.creditSales?.length || 0})</span>
                  </div>
                  <div class="detail-item">
                    <span>Credit Back:</span>
                    <span>${safeFormatINR(creditBackAmt)} (${shift.creditBack?.length || 0})</span>
                  </div>
                </div>
              </div>

              ${shift.readings.length > 0 ? `
                <table class="readings-table">
                  <thead>
                    <tr>
                      <th>Fuel Type</th>
                      <th>Nozzle</th>
                      <th>Opening</th>
                      <th>Closing</th>
                      <th>Volume (L)</th>
                      <th>Rate (₹/L)</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${shift.readings.map(r => `
                      <tr>
                        <td>${r.fuelType}</td>
                        <td>${r.nozzle}</td>
                        <td>${Number(r.opening).toFixed(2)}</td>
                        <td>${Number(r.closing).toFixed(2)}</td>
                        <td>${(r.closing - r.opening).toFixed(2)} L</td>
                        <td>₹${(shift.dayRate?.[r.fuelType] || 0).toFixed(2)}/L</td>
                        <td>${safeFormatINR((r.closing - r.opening) * (shift.dayRate?.[r.fuelType] || 0))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}

              ${(shift.lubeSales?.length > 0) ? `
                <h4 style="margin-top: 15px; margin-bottom: 10px;">Lube Sales</h4>
                <table class="lube-table">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Quantity (L)</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${shift.lubeSales.map(lube => `
                      <tr>
                        <td>${lube.description}</td>
                        <td>${Number(lube.quantity || 0).toFixed(2)} L</td>
                        <td>${safeFormatINR(lube.amount)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}

              ${(shift.nozzleTesting?.length > 0) ? `
                <h4 style="margin-top: 15px; margin-bottom: 10px;">Nozzle Testing/Calibration</h4>
                <table class="testing-table">
                  <thead>
                    <tr>
                      <th>Fuel Type</th>
                      <th>Quantity (L)</th>
                      <th>Rate (₹/L)</th>
                      <th>Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${shift.nozzleTesting.map(test => `
                      <tr>
                        <td>${test.fuelType}</td>
                        <td>${Number(test.quantity || 0).toFixed(2)} L</td>
                        <td>₹${(shift.dayRate?.[test.fuelType] || 0).toFixed(2)}/L</td>
                        <td>${safeFormatINR((shift.dayRate?.[test.fuelType] || 0) * (test.quantity || 0))}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : ''}

              ${(shift.creditSales?.length > 0 || shift.creditBack?.length > 0) ? `
                <div class="credit-transactions">
                  ${shift.creditSales?.length > 0 ? `
                    <h4>Credit Sales (${shift.creditSales.length})</h4>
                    <div class="credit-list">
                      ${shift.creditSales.map(cs => `
                        <div class="credit-item">
                          ${cs.code} - ${cs.actName}: ${safeFormatINR(cs.amount)} (${cs.fuelType} - ${Number(cs.quantity).toFixed(2)}L)
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                  
                  ${shift.creditBack?.length > 0 ? `
                    <h4>Credit Back (${shift.creditBack.length})</h4>
                    <div class="credit-list">
                      ${shift.creditBack.map(cb => `
                        <div class="credit-item">
                          ${cb.code} - ${cb.actName}: ${safeFormatINR(cb.amount)} (${cb.paymentType})
                        </div>
                      `).join('')}
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;
  }).join('')}
      </div>
    </body>
    </html>
  `;

  // Debug the generated content
  console.log('📄 Generated HTML content length:', printContent.length);
  console.log('🔍 HTML preview (first 500 chars):', printContent.substring(0, 500));
  console.log('🔍 HTML preview (last 500 chars):', printContent.substring(printContent.length - 500));

  // Create a new window and print
  const printWindow = window.open('', '_blank');

  if (!printWindow) {
    // Fallback if popup is blocked
    alert('Please allow popups for this site to enable printing, or try printing from the browser menu.');
    return;
  }

  try {
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      // Add a small delay to ensure everything is rendered
      setTimeout(() => {
        try {
          printWindow.focus(); // Ensure the print window has focus
          printWindow.print();
        } catch (error) {
          console.error('Error during printing:', error);
          alert('There was an error during printing. Please try again.');
        }

        // Don't auto-close the window - let the user close it manually
        // This prevents the flashing issue and gives users control
      }, 500);
    };

    // Fallback in case onload doesn't fire
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        try {
          printWindow.focus();
          printWindow.print();
        } catch (error) {
          console.error('Error during fallback printing:', error);
        }
      }
    }, 1000);
  } catch (error) {
    console.error('Error creating print content:', error);
    alert('There was an error generating the print content. Please check the console for details.');
    printWindow.close();
  }
}; 