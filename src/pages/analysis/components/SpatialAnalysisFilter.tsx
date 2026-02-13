import { useState } from 'react';
import { Select, Input, Button, Tag, Row, Col } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { SpatialAnalysisFilter } from '../../../types/analysis.type';

const opLabel = (ops: any[], op: number) => ops.find((o: any) => o.id === op)?.value ?? String(op);
const opIsNull = (ops: any[], op: number) => !!ops.find((o: any) => o.id === op)?.isNull;

export default function FilterBuilder({
  filterOperators,
  filters,
  onFiltersChange,
}: {
  filterOperators: any[];
  filters: SpatialAnalysisFilter[];
  onFiltersChange: (f: SpatialAnalysisFilter[]) => void;
}) {
  const [attr, setAttr] = useState('');
  const [op, setOp] = useState<number | null>(null);
  const [val, setVal] = useState('');

  const isNull = op !== null && opIsNull(filterOperators, op);
  const canAdd = attr.trim() && op !== null && (isNull || val.trim());

  const handleAdd = () => {
    if (!canAdd || op === null) return;
    onFiltersChange([...filters, { attribute: attr.trim(), operation: op, value: isNull ? '' : val.trim(), order: filters.length + 1 }]);
    setAttr(''); setOp(null); setVal('');
  };

  const handleRemove = (i: number) => {
    onFiltersChange(filters.filter((_, idx) => idx !== i).map((f, idx) => ({ ...f, order: idx })));
  };

  return (
    <>
      {filters.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8, marginBottom: 8 }}>
          {filters.map((f, i) => (
            <Tag
              key={i}
              closable
              onClose={() => handleRemove(i)}
              color="warning"
              style={{ fontFamily: 'monospace', fontSize: 11 }}>
              {
                f.value
                  ? `${f.attribute} ${opLabel(filterOperators, f.operation)} ${f.value}`
                  : `${f.attribute} ${opLabel(filterOperators, f.operation)}`
              }
            </Tag>
          ))}
        </div>
      )}

      <Row gutter={8} style={{ marginTop: 8 }}>

        <Col span={isNull ? 10 : 7}>
          <Input
            size="small"
            placeholder="Atribut"
            value={attr}
            onChange={e => setAttr(e.target.value)}
          />
        </Col>

        <Col span={isNull ? 10 : 6}>
          <Select
            size="small"
            style={{ width: '100%' }}
            placeholder="Operator"
            value={op ?? undefined}
            onChange={v => { setOp(v ?? null); if (v !== null && opIsNull(filterOperators, v)) setVal(''); }}
            options={filterOperators.map((a: any) => ({ value: a.id, label: a.value }))}
          />
        </Col>

        {!isNull && (
          <Col span={7}>
            <Input
              size="small"
              placeholder="Dəyər"
              value={val}
              onChange={e => setVal(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Col>
        )}

        <Col span={4}>
          <Button
            size="small"
            type="primary"
            icon={<PlusOutlined />}
            disabled={!canAdd}
            onClick={handleAdd}
          />
        </Col>

      </Row>
    </>
  );
}