import type { LineItem } from './appTypes'
import { calcTotalesLines, lineTotalConIva, normalizeLineItem } from './opsHelpers'

type Props = {
  items: LineItem[]
  onChange: (next: LineItem[]) => void
  fmt: (n: number) => string
  /** Encabezados tipo lista guardada HTML */
  columnLabels?: { item?: string; totalLine?: string }
  /** Lista guardada HTML: botón Sin IVA / IVA ✓ */
  ivaToggle?: 'checkbox' | 'badge'
  /** Ícono ✕ compacto en lugar del botón «Quitar» */
  compactRemove?: boolean
}

export function LineItemsEditor({
  items,
  onChange,
  fmt,
  columnLabels,
  ivaToggle = 'checkbox',
  compactRemove = false,
}: Props) {
  const update = (i: number, patch: Partial<LineItem>) => {
    const next = [...items]
    next[i] = normalizeLineItem({ ...next[i], ...patch })
    onChange(next)
  }

  const tot = calcTotalesLines(items)

  return (
    <>
      {items.length > 0 && (
        <div className="tw tw-items-preview">
          <table>
            <thead>
              <tr>
                <th>{columnLabels?.item ?? 'Ítem'}</th>
                <th>Unidad</th>
                <th>Cant.</th>
                <th>P. unit.</th>
                <th title="Descuento %">Dto %</th>
                <th>IVA</th>
                <th>{columnLabels?.totalLine ?? 'Total línea'}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={`${it.nombre}-${idx}`}>
                  <td>{it.nombre}</td>
                  <td>{it.unidad}</td>
                  <td>
                    <input
                      className="input-inline-num"
                      type="number"
                      min={0}
                      step={1}
                      value={it.qty}
                      onChange={(e) => update(idx, { qty: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input-inline-num"
                      type="number"
                      min={0}
                      step={1}
                      value={it.pu}
                      onChange={(e) => update(idx, { pu: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      className="input-inline-num input-inline-dto"
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={it.dto ?? ''}
                      placeholder="0"
                      onChange={(e) => update(idx, { dto: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    {ivaToggle === 'badge' ? (
                      <button
                        type="button"
                        className={`btn-iva-badge ${it.iva ? 'btn-iva-badge-on' : ''}`}
                        onClick={() => update(idx, { iva: !it.iva })}
                      >
                        {it.iva ? 'IVA ✓' : 'Sin IVA'}
                      </button>
                    ) : (
                      <label className="check-iva">
                        <input type="checkbox" checked={Boolean(it.iva)} onChange={(e) => update(idx, { iva: e.target.checked })} />
                        <span>19%</span>
                      </label>
                    )}
                  </td>
                  <td className="td-mono">{fmt(lineTotalConIva(it))}</td>
                  <td>
                    <button
                      type="button"
                      className={compactRemove ? 'btn-cot-row-remove' : 'btn btn-xs btn-red'}
                      title="Quitar ítem"
                      onClick={() => onChange(items.filter((_, j) => j !== idx))}
                    >
                      {compactRemove ? '✕' : 'Quitar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="line-items-totals">
            {tot.dtoTotal > 0 && (
              <div className="lit-row">
                <span>Descuento ítems</span>
                <span className="lit-val lit-dto">−{fmt(tot.dtoTotal)}</span>
              </div>
            )}
            {tot.ivaAmt > 0 && (
              <div className="lit-row">
                <span>IVA (19%)</span>
                <span className="lit-val">{fmt(tot.ivaAmt)}</span>
              </div>
            )}
            <div className="lit-row lit-strong">
              <span>Total documento</span>
              <span className="lit-val">{fmt(tot.total)}</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
