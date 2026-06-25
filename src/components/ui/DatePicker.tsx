import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "../../lib/utils"
import { Calendar } from "./calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./popover"
import { Button } from "./index" // because Button might be in index.tsx

export function DatePicker({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  const date = value ? new Date(value) : undefined;
  return (
    <Popover>
      <PopoverTrigger className={cn(
            "flex h-10 w-full rounded-md border border-border bg-input-bg px-3 py-2 text-sm ring-offset-bg items-center text-left font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
            !date && "text-muted-fg"
          )}
        >
          {date ? format(date, "dd/MM/yyyy") : <span>Pick a date</span>}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              const y = d.getFullYear()
              const m = String(d.getMonth() + 1).padStart(2, '0')
              const day = String(d.getDate()).padStart(2, '0')
              onChange(`${y}-${m}-${day}`)
            } else {
              onChange("")
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
