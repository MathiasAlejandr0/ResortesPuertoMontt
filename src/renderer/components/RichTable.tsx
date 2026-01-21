import { useState, useMemo } from 'react'
import { Search, Filter, MoreVertical, Edit, Eye, Trash2 } from 'lucide-react'
import { Input } from './ui/input'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { cn } from '../utils/cn'

export interface Column<T> {
  key: string
  header: string
  accessor?: (row: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface RichTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  searchPlaceholder?: string
  onEdit?: (row: T) => void
  onView?: (row: T) => void
  onDelete?: (row: T) => void
  customActions?: (row: T) => React.ReactNode
  emptyMessage?: string
  className?: string
}

export function RichTable<T extends { id?: number | string }>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = "Buscar...",
  onEdit,
  onView,
  onDelete,
  customActions,
  emptyMessage = "No hay datos disponibles",
  className,
}: RichTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [showFilters, setShowFilters] = useState(false)

  // Filtrar datos
  const filteredData = useMemo(() => {
    if (!searchTerm) return data

    return data.filter((row) => {
      return columns.some((col) => {
        const value = col.accessor
          ? String(col.accessor(row))
          : String((row as any)[col.key])
        return value.toLowerCase().includes(searchTerm.toLowerCase())
      })
    })
  }, [data, searchTerm, columns])

  // Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData

    return [...filteredData].sort((a, b) => {
      const column = columns.find((col) => col.key === sortColumn)
      if (!column) return 0

      const aValue = column.accessor
        ? String(column.accessor(a))
        : String((a as any)[column.key])
      const bValue = column.accessor
        ? String(column.accessor(b))
        : String((b as any)[column.key])

      const comparison = aValue.localeCompare(bValue, undefined, {
        numeric: true,
        sensitivity: 'base',
      })

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredData, sortColumn, sortDirection, columns])

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(columnKey)
      setSortDirection('asc')
    }
  }

  const hasActions = onEdit || onView || onDelete || customActions

  return (
    <div className={cn("bg-white rounded-xl shadow-sm border border-border", className)}>
      {/* Header con búsqueda y filtros */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {searchable && (
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50 border-slate-200 focus:bg-white"
            />
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-slate-100")}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-border">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider",
                    column.sortable && "cursor-pointer hover:bg-slate-100 transition-colors",
                    column.className
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {column.sortable && sortColumn === column.key && (
                      <span className="text-primary">
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {hasActions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                  Acciones
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-border">
            {sortedData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (hasActions ? 1 : 0)}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={row.id || index}
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn("px-4 py-3 text-sm text-foreground", column.className)}
                    >
                      {column.accessor
                        ? column.accessor(row)
                        : (row as any)[column.key]}
                    </td>
                  ))}
                  {hasActions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {customActions && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {customActions(row)}
                          </div>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {onView && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onView(row)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Detalles
                              </DropdownMenuItem>
                            )}
                            {onEdit && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onEdit(row)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            {onDelete && (
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onDelete(row)
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Borrar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer con información */}
      {sortedData.length > 0 && (
        <div className="px-4 py-3 border-t border-border bg-slate-50 text-sm text-muted-foreground">
          Mostrando {sortedData.length} de {data.length} registros
        </div>
      )}
    </div>
  )
}
