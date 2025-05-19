import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

const MultiSelect = ({ options = [], value = [], onChange, placeholder = "Select items" }) => {
  const [open, setOpen] = React.useState(false);

  const toggleValue = (val) => {
    if (value.includes(val)) {
      onChange(value.filter((v) => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            'w-full justify-between',
            !value.length && 'text-muted-foreground'
          )}
        >
          {value.length ? (
            <div className="flex flex-wrap gap-1">
              {value.map((val) => (
                <Badge key={val} className="bg-gray-100 text-gray-800">
                  {val}
                </Badge>
              ))}
            </div>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandList>
            {options.map((option) => (
              <CommandItem
                key={option}
                onSelect={() => toggleValue(option)}
                className="flex items-center gap-2"
              >
                <Checkbox
                  checked={value.includes(option)}
                  onCheckedChange={() => toggleValue(option)}
                />
                {option}
                {value.includes(option) && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default MultiSelect;
