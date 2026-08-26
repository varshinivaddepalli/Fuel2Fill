"use client"

import { useState, useEffect } from "react"
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { getCalendarAttendance, type CalendarAttendanceDay } from "@/actions/attendance"
import { getClientStations } from "@/actions/stations"
import type { Station } from "@/types/database"

interface AttendanceCalendarProps {
  onDateSelect?: (date: string) => void
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function AttendanceCalendar({ onDateSelect }: AttendanceCalendarProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1) // 1-indexed
  const [loading, setLoading] = useState(true)
  const [calendarData, setCalendarData] = useState<CalendarAttendanceDay[]>([])
  const [stations, setStations] = useState<Station[]>([])
  const [selectedStation, setSelectedStation] = useState<string>("")

  // Load stations on mount
  useEffect(() => {
    async function loadStations() {
      const result = await getClientStations()
      if (result.success) {
        setStations(result.stations)
      }
    }
    loadStations()
  }, [])

  // Load calendar data when month/year/station changes
  useEffect(() => {
    async function loadCalendarData() {
      setLoading(true)
      // Handle "all" as no filter (undefined)
      const stationFilter = selectedStation === "all" ? undefined : selectedStation || undefined
      const result = await getCalendarAttendance(
        currentYear,
        currentMonth,
        stationFilter
      )
      if (result.success) {
        setCalendarData(result.days)
      }
      setLoading(false)
    }
    loadCalendarData()
  }, [currentYear, currentMonth, selectedStation])

  const goToPreviousMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12)
      setCurrentYear((prev) => prev - 1)
    } else {
      setCurrentMonth((prev) => prev - 1)
    }
  }

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1)
      setCurrentYear((prev) => prev + 1)
    } else {
      setCurrentMonth((prev) => prev + 1)
    }
  }

  const goToToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth() + 1)
  }

  // Generate calendar grid
  const generateCalendarDays = () => {
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const daysInMonth = lastDay.getDate()

    // Get day of week (0 = Sunday, convert to Monday = 0)
    let startDayOfWeek = firstDay.getDay() - 1
    if (startDayOfWeek < 0) startDayOfWeek = 6

    const days: (number | null)[] = []

    // Add empty slots for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }

    return days
  }

  const getDateString = (day: number) => {
    return `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const getAttendanceForDay = (day: number): CalendarAttendanceDay | undefined => {
    const dateStr = getDateString(day)
    return calendarData.find((d) => d.date === dateStr)
  }

  const getDayColor = (day: number): string => {
    const data = getAttendanceForDay(day)
    if (!data || data.total === 0) return ""

    const presentRatio = data.present / data.total
    const absentRatio = data.absent / data.total

    if (presentRatio >= 0.8) return "bg-emerald-100 dark:bg-emerald-950/50"
    if (presentRatio >= 0.5) return "bg-amber-100 dark:bg-amber-950/50"
    if (absentRatio >= 0.5) return "bg-red-100 dark:bg-red-950/50"
    return "bg-neutral-100 dark:bg-neutral-900"
  }

  const isToday = (day: number): boolean => {
    return (
      day === today.getDate() &&
      currentMonth === today.getMonth() + 1 &&
      currentYear === today.getFullYear()
    )
  }

  const isFuture = (day: number): boolean => {
    const date = new Date(currentYear, currentMonth - 1, day)
    date.setHours(0, 0, 0, 0)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    return date > todayStart
  }

  const calendarDays = generateCalendarDays()

  return (
    <div className="space-y-4">
      {/* Station Filter */}
      <Select value={selectedStation} onValueChange={setSelectedStation}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="All Stations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Stations</SelectItem>
          {stations.map((station) => (
            <SelectItem key={station.station_id} value={station.station_id}>
              {station.station_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
          <ChevronLeft className="size-4" />
        </Button>

        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {MONTHS[currentMonth - 1]} {currentYear}
          </span>
          <Button variant="ghost" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={goToNextMonth}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Calendar Grid */}
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <TooltipProvider>
            <div className="grid grid-cols-7 gap-1">
              {/* Weekday headers */}
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const attendance = getAttendanceForDay(day)
                const dayIsFuture = isFuture(day)
                const dayIsToday = isToday(day)
                const dayColor = getDayColor(day)

                return (
                  <Tooltip key={day}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => !dayIsFuture && onDateSelect?.(getDateString(day))}
                        disabled={dayIsFuture}
                        className={`
                          aspect-square rounded-md flex flex-col items-center justify-center text-sm
                          transition-colors relative
                          ${dayIsFuture ? "text-muted-foreground/40 cursor-not-allowed" : "hover:bg-accent cursor-pointer"}
                          ${dayIsToday ? "ring-2 ring-primary" : ""}
                          ${dayColor}
                        `}
                      >
                        <span className={dayIsToday ? "font-bold" : ""}>{day}</span>
                        {attendance && attendance.total > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {attendance.present > 0 && (
                              <div className="size-1.5 rounded-full bg-emerald-500" />
                            )}
                            {attendance.absent > 0 && (
                              <div className="size-1.5 rounded-full bg-red-500" />
                            )}
                            {(attendance.half_day > 0 || attendance.leave > 0) && (
                              <div className="size-1.5 rounded-full bg-amber-500" />
                            )}
                          </div>
                        )}
                      </button>
                    </TooltipTrigger>
                    {attendance && attendance.total > 0 && (
                      <TooltipContent>
                        <div className="text-xs space-y-1">
                          <div className="font-medium">{getDateString(day)}</div>
                          <div className="space-y-0.5">
                            {attendance.present > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="size-2 rounded-full bg-emerald-500" />
                                Present: {attendance.present}
                              </div>
                            )}
                            {attendance.absent > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="size-2 rounded-full bg-red-500" />
                                Absent: {attendance.absent}
                              </div>
                            )}
                            {attendance.half_day > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="size-2 rounded-full bg-amber-500" />
                                Half Day: {attendance.half_day}
                              </div>
                            )}
                            {attendance.leave > 0 && (
                              <div className="flex items-center gap-1">
                                <div className="size-2 rounded-full bg-blue-500" />
                                Leave: {attendance.leave}
                              </div>
                            )}
                          </div>
                        </div>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        )}

      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-emerald-500" />
          Present
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-red-500" />
          Absent
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-amber-500" />
          Half Day
        </div>
        <div className="flex items-center gap-1">
          <div className="size-2.5 rounded-full bg-blue-500" />
          Leave
        </div>
      </div>
    </div>
  )
}
