'use client';

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  type Cell,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type Header,
  type SortingState,
  type Table,
  useReactTable,
} from '@tanstack/react-table';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightIcon,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Copy,
  GripVertical,
  Search,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@repo/ui/components/ui/context-menu';

// ─── Re-exported types (so consumers don't need @tanstack/react-table) ───────

export { type ColumnDef, type FilterFn } from '@tanstack/react-table';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DataTableFilterTabs {
  columnId: string;
  /** Label for the "show all" tab. Defaults to "All". */
  allLabel?: string;
  options: Array<{ value: string; label: string }>;
}

export interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  /** Fixed pixel width for each column by column id */
  columnWidths: Record<string, number>;
  /** Provide a stable row identifier. Strongly recommended when rows can be filtered. */
  getRowId?: (row: TData, index: number) => string;
  // Search
  searchPlaceholder?: string;
  globalFilterFn?: FilterFn<TData>;
  // Tab filter (optional — for a single column)
  filterTabs?: DataTableFilterTabs;
  // Expandable rows (optional)
  renderExpand?: (row: TData) => React.ReactNode;
  // Pagination
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  /** Appended to the "X / Y" count. E.g. "records" → "12 / 20 records" */
  totalLabel?: string;
}

// ─── Internal subcomponents ───────────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  return (
    <span className="relative ml-1 inline-flex h-3.5 w-3.5 shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        {direction === false && (
          <motion.span
            key="none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ArrowUpDown className="text-muted-foreground/50 h-3 w-3" />
          </motion.span>
        )}
        {direction === 'asc' && (
          <motion.span
            key="asc"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ArrowUp className="text-foreground h-3 w-3" />
          </motion.span>
        )}
        {direction === 'desc' && (
          <motion.span
            key="desc"
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <ArrowDown className="text-foreground h-3 w-3" />
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}

function DraggableHeader<TData>({
  header,
  columnWidths,
}: {
  header: Header<TData, unknown>;
  columnWidths: Record<string, number>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: header.column.id,
  });
  return (
    <div
      ref={setNodeRef}
      style={{
        width: columnWidths[header.column.id],
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
      }}
      className="flex shrink-0 items-center gap-1 pr-4"
    >
      <button
        {...attributes}
        {...listeners}
        type="button"
        aria-label="Drag to reorder column"
        className="text-muted-foreground/50 hover:text-muted-foreground shrink-0 cursor-grab touch-none rounded p-0.5 active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={header.column.getToggleSortingHandler()}
        className="text-muted-foreground hover:text-foreground flex items-center text-xs font-semibold tracking-wide uppercase transition-colors duration-100"
      >
        {flexRender(header.column.columnDef.header, header.getContext())}
        <SortIcon direction={header.column.getIsSorted()} />
      </button>
    </div>
  );
}

function BodyCell<TData>({
  cell,
  columnWidths,
  translateX,
  dimmed,
  animate,
}: {
  cell: Cell<TData, unknown>;
  columnWidths: Record<string, number>;
  translateX?: number;
  dimmed?: boolean;
  animate?: boolean;
}) {
  const contentRef = useRef<HTMLDivElement>(null);

  const getCellText = useCallback(
    () =>
      contentRef.current?.textContent?.trim() ?? String(cell.getValue() ?? ''),
    [cell],
  );

  const getHeaderText = useCallback(
    () => String(cell.column.columnDef.header ?? cell.column.id),
    [cell.column],
  );

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(getCellText());
  }, [getCellText]);

  const handleCopyWithHeader = useCallback(() => {
    navigator.clipboard.writeText(`${getHeaderText()}\n${getCellText()}`);
  }, [getCellText, getHeaderText]);

  return (
    <div
      style={{
        width: columnWidths[cell.column.id],
        transform:
          translateX != null ? `translateX(${translateX}px)` : undefined,
        transition: animate
          ? 'transform 250ms ease, opacity 150ms'
          : 'opacity 150ms',
        opacity: dimmed ? 0 : 1,
      }}
      className="shrink-0 overflow-hidden pr-4 select-text"
    >
      <ContextMenu>
        <ContextMenuTrigger className="select-text">
          <div ref={contentRef}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={handleCopy}>
            <Copy className="h-4 w-4" />
            Copy
          </ContextMenuItem>
          <ContextMenuItem onClick={handleCopyWithHeader}>
            <ClipboardList className="h-4 w-4" />
            Copy with Header
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
}

function ColumnDragOverlay<TData>({
  columnId,
  table,
  columnWidths,
}: {
  columnId: string;
  table: Table<TData>;
  columnWidths: Record<string, number>;
}) {
  const headerInst = table
    .getFlatHeaders()
    .find((h) => h.column.id === columnId);
  const rows = table.getRowModel().rows;
  return (
    <div
      style={{ width: columnWidths[columnId] }}
      className="bg-background border-border flex cursor-grabbing flex-col overflow-hidden rounded-lg border opacity-[0.97] shadow-2xl"
    >
      <div className="bg-muted border-border flex items-center gap-1 border-b px-4 py-3">
        <GripVertical className="text-muted-foreground h-3 w-3 shrink-0" />
        <span className="text-foreground text-xs font-semibold tracking-wide uppercase">
          {headerInst
            ? flexRender(
                headerInst.column.columnDef.header,
                headerInst.getContext(),
              )
            : columnId}
        </span>
      </div>
      {rows.map((row) => {
        const cell = row.getAllCells().find((c) => c.column.id === columnId);
        return (
          <div
            key={row.id}
            className="border-border/50 overflow-hidden border-b px-3 py-3.5 last:border-0"
          >
            {cell
              ? flexRender(cell.column.columnDef.cell, cell.getContext())
              : null}
          </div>
        );
      })}
    </div>
  );
}

// ─── DataTable ────────────────────────────────────────────────────────────────

export function DataTable<TData>({
  data,
  columns,
  columnWidths,
  getRowId,
  searchPlaceholder = 'Search…',
  globalFilterFn,
  filterTabs,
  renderExpand,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 20],
  totalLabel = '',
}: DataTableProps<TData>) {
  'use no memo';

  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() =>
    columns.map((c) => c.id!),
  );
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const headerScrollRef = useRef<HTMLDivElement>(null);

  const hasExpand = !!renderExpand;

  // Derive active tab from columnFilters for tab UI
  const activeTabValue = filterTabs
    ? ((columnFilters.find((f) => f.id === filterTabs.columnId)
        ?.value as string) ?? 'all')
    : null;

  const allTabs = filterTabs
    ? [
        { value: 'all', label: filterTabs.allLabel ?? 'All' },
        ...filterTabs.options,
      ]
    : [];

  function handleTabFilter(value: string) {
    setColumnFilters((prev) => {
      if (!filterTabs) return prev;
      const without = prev.filter((f) => f.id !== filterTabs.columnId);
      return value === 'all'
        ? without
        : [...without, { id: filterTabs.columnId, value }];
    });
    table.setPageIndex(0);
  }

  const columnTransforms = useMemo(() => {
    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId)
      return {} as Record<string, number>;
    const activeIdx = columnOrder.indexOf(activeColumnId);
    const overIdx = columnOrder.indexOf(overColumnId);
    const result: Record<string, number> = {};
    columnOrder.forEach((colId, idx) => {
      if (colId === activeColumnId) {
        result[colId] = 0;
        return;
      }
      if (activeIdx < overIdx) {
        result[colId] =
          idx > activeIdx && idx <= overIdx
            ? -(columnWidths[activeColumnId] ?? 0)
            : 0;
      } else {
        result[colId] =
          idx >= overIdx && idx < activeIdx
            ? (columnWidths[activeColumnId] ?? 0)
            : 0;
      }
    });
    return result;
  }, [activeColumnId, overColumnId, columnOrder, columnWidths]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor, {}),
  );

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, columnFilters, sorting, columnOrder },
    ...(getRowId && { getRowId }),
    ...(globalFilterFn && { globalFilterFn }),
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onSortingChange: setSorting,
    onColumnOrderChange: setColumnOrder,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: defaultPageSize } },
  });

  useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset to page 0 when filters or sort change
  useEffect(() => {
    table.setPageIndex(0);
  }, [globalFilter, columnFilters, sorting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear expanded row when it's filtered out
  const allFilteredRows = table.getFilteredRowModel().rows;
  useEffect(() => {
    if (expandedId && !allFilteredRows.some((r) => r.id === expandedId))
      setExpandedId(null);
  }, [allFilteredRows, expandedId]);

  function syncHeaderScroll(e: React.UIEvent<HTMLDivElement>) {
    if (headerScrollRef.current)
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveColumnId(event.active.id as string);
    setOverColumnId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveColumnId(null);
    setOverColumnId(null);
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setColumnOrder((prev) =>
        arrayMove(
          prev,
          prev.indexOf(active.id as string),
          prev.indexOf(over.id as string),
        ),
      );
    }
  }

  const headers = table.getFlatHeaders();
  const rows = table.getRowModel().rows;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="mb-4 flex shrink-0 items-center gap-3">
        {/* Search */}
        <div className="relative max-w-xs flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border py-2 pr-8 pl-9 text-sm focus:ring-2 focus:outline-none"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Tab filter */}
        {filterTabs && (
          <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
            {allTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabFilter(tab.value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
                  activeTabValue === tab.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Count */}
        <span className="text-muted-foreground ml-auto text-sm tabular-nums">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={totalFiltered}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.12 }}
              className="inline-block"
            >
              {totalFiltered}
            </motion.span>
          </AnimatePresence>
          /{data.length}
          {totalLabel ? ` ${totalLabel}` : ''}
        </span>
      </div>

      {/* ── Table card ───────────────────────────────────────────────────── */}
      <div className="border-border flex flex-1 flex-col overflow-hidden rounded-xl border">
        <DndContext
          id="data-table-dnd"
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToHorizontalAxis]}
          onDragStart={handleDragStart}
          onDragOver={(e) => setOverColumnId((e.over?.id as string) ?? null)}
          onDragEnd={handleDragEnd}
          onDragCancel={() => {
            setActiveColumnId(null);
            setOverColumnId(null);
          }}
        >
          {/* Header — no scrollbar, synced horizontally with body via JS */}
          <div
            ref={headerScrollRef}
            className="border-border shrink-0 overflow-hidden border-b"
          >
            <div className="min-w-max">
              <div className="bg-muted flex items-center px-4 py-3">
                {hasExpand && <div className="w-9 shrink-0" />}
                <SortableContext
                  items={columnOrder}
                  strategy={horizontalListSortingStrategy}
                >
                  {headers.map((header) => (
                    <DraggableHeader
                      key={header.id}
                      header={header}
                      columnWidths={columnWidths}
                    />
                  ))}
                </SortableContext>
              </div>
            </div>
          </div>

          {/* Body — owns both scrollbars */}
          <div onScroll={syncHeaderScroll} className="flex-1 overflow-auto">
            <div className="min-w-max">
              <div key={pageIndex} className="relative overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                  {rows.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-muted-foreground py-16 text-center text-sm"
                    >
                      No results found.
                    </motion.div>
                  ) : (
                    rows.map((row) => {
                      const isExpanded = expandedId === row.id;
                      return (
                        <motion.div
                          key={row.id}
                          layout="position"
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.25, 0.46, 0.45, 0.94],
                          }}
                          className="border-border/50 border-b last:border-0"
                        >
                          <div
                            role={hasExpand ? 'button' : undefined}
                            tabIndex={hasExpand ? 0 : undefined}
                            onClick={() =>
                              hasExpand &&
                              setExpandedId(isExpanded ? null : row.id)
                            }
                            onKeyDown={(e) => {
                              if (
                                hasExpand &&
                                (e.key === 'Enter' || e.key === ' ')
                              ) {
                                e.preventDefault();
                                setExpandedId(isExpanded ? null : row.id);
                              }
                            }}
                            className={`flex items-center px-4 py-3.5 transition-colors duration-100 select-none ${
                              hasExpand ? 'cursor-pointer' : ''
                            } ${isExpanded ? 'bg-muted/50' : hasExpand ? 'hover:bg-muted/40' : ''}`}
                          >
                            {hasExpand && (
                              <div className="flex w-9 shrink-0 justify-center">
                                <ChevronRight
                                  className={`text-muted-foreground/50 h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              </div>
                            )}
                            {row.getVisibleCells().map((cell) => (
                              <BodyCell
                                key={cell.id}
                                cell={cell}
                                columnWidths={columnWidths}
                                translateX={columnTransforms[cell.column.id]}
                                dimmed={activeColumnId === cell.column.id}
                                animate={activeColumnId !== null}
                              />
                            ))}
                          </div>

                          {hasExpand && (
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  key="panel"
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{
                                    duration: 0.22,
                                    ease: 'easeInOut',
                                  }}
                                  style={{ overflow: 'hidden' }}
                                >
                                  {renderExpand!(row.original)}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeColumnId ? (
              <ColumnDragOverlay
                columnId={activeColumnId}
                table={table}
                columnWidths={columnWidths}
              />
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ── Pagination ───────────────────────────────────────────────── */}
        <div className="bg-muted border-border flex shrink-0 items-center justify-between border-t px-4 py-3">
          <div className="text-muted-foreground flex items-center gap-2 text-sm">
            <span>Per page</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="border-input bg-background text-foreground focus:ring-ring rounded-md border px-2 py-1 text-sm focus:ring-2 focus:outline-none"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>rows</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="mx-1 flex items-center gap-1">
              {Array.from({ length: pageCount }, (_, i) => (
                <button
                  key={i}
                  onClick={() => table.setPageIndex(i)}
                  className={`h-8 min-w-8 rounded-md px-2 text-sm font-medium transition-colors ${
                    i === pageIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Next page"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!table.getCanNextPage()}
              className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>

          <span className="text-muted-foreground text-sm tabular-nums">
            {pageIndex * pageSize + 1}–
            {Math.min((pageIndex + 1) * pageSize, totalFiltered)} /{' '}
            {totalFiltered}
          </span>
        </div>
      </div>
    </div>
  );
}
