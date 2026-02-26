import * as React from "react"
import { cn } from "../../lib/utils"
import { ChevronDown } from "lucide-react"

const SelectContext = React.createContext(null)

const Select = ({ children, value, onValueChange }) => {
    const [open, setOpen] = React.useState(false)
    const containerRef = React.useRef(null)

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative w-full" ref={containerRef}>
                {children}
            </div>
        </SelectContext.Provider>
    )
}

const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
    const { open, setOpen } = React.useContext(SelectContext)
    return (
        <button
            ref={ref}
            type="button"
            onClick={() => setOpen(!open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
            {...props}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50 transition-transform duration-200" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </button>
    )
})

const SelectValue = ({ placeholder, ...props }) => {
    const { value } = React.useContext(SelectContext)
    return <span className="pointer-events-none truncate">{value || placeholder}</span>
}

const SelectContent = ({ children, className, ...props }) => {
    const { open } = React.useContext(SelectContext)
    if (!open) return null
    return (
        <div
            className={cn(
                "absolute z-50 mt-1 max-h-60 min-w-[8rem] overflow-hidden rounded-md border bg-white text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
                className
            )}
        >
            <div className="p-1">
                {children}
            </div>
        </div>
    )
}

const SelectItem = React.forwardRef(({ className, children, value: itemValue, ...props }, ref) => {
    const { value: activeValue, onValueChange, setOpen } = React.useContext(SelectContext)
    const isSelected = itemValue === activeValue

    return (
        <div
            ref={ref}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-slate-100 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                isSelected && "bg-slate-50 font-semibold text-blue-600",
                className
            )}
            onClick={() => {
                onValueChange(itemValue)
                setOpen(false)
            }}
            {...props}
        >
            <span className="truncate">{children}</span>
        </div>
    )
})

export {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
}
