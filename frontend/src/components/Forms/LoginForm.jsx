import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLogin } from "@/Hooks/AuthHooks/useLogin";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/Hooks/AuthHooks/useAuthContext";
import { Icons } from "@/components/ui/icons";

export default function LoginForm() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error, shiftWarning, clearWarning } = useLogin();
  const { user } = useAuthContext();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  const handleAdminOverride = async () => {
    clearWarning();
    await login(username, password, true); // Admin override
  };

  const formatTimeAgo = (hoursAgo) => {
    if (hoursAgo < 1) {
      const minutes = Math.round(hoursAgo * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    }
    return `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <Card className="w-full max-w-md shadow-xl bg-gradient-to-br from-white to-gray-50/50">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            <Icons.logo className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome back
          </CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="username">
                Username
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-3 py-2"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium" htmlFor="password">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3 py-2"
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icons.warning className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full font-medium"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Icons.spinner className="h-4 w-4 animate-spin" />
                  <span>Logging in...</span>
                </div>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Shift Warning Dialog */}
      <AlertDialog open={!!shiftWarning} onOpenChange={() => clearWarning()}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <Icons.warning className="h-5 w-5" />
              Recent Shift Detected
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <div className="text-sm">
                {shiftWarning?.message}
              </div>
              {shiftWarning?.shiftDetails && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <div className="text-xs text-amber-800 space-y-1">
                    <div><strong>Shift Type:</strong> {shiftWarning.shiftDetails.timeType}</div>
                    <div><strong>Submitted:</strong> {formatTimeAgo(shiftWarning.shiftDetails.hoursAgo)}</div>
                    <div><strong>Time:</strong> {new Date(shiftWarning.shiftDetails.submittedAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-600">
                <strong>Note:</strong> Logging in too soon after a shift may indicate a duplicate submission. 
                Please verify with admin before proceeding.
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel onClick={clearWarning} className="w-full sm:w-auto">
              Cancel Login
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAdminOverride}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700"
            >
              Admin Override - Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
