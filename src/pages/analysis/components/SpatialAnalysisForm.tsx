import { useEffect, useState } from 'react';

import {
  Card,
  Select,
  Input,
  Button,
  Tag,
  Alert,
  Row,
  Col,
  Divider,
  Form,
} from 'antd';

import {
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons';

import type { SpatialAnalysisCreate, SpatialAnalysisFilter, SpatialAnalysisTarget } from '../../../types/analysis.type';
import { OrganizationService } from '../../../services/organization.service';
import { SpatialAnalysisService } from '../../../services/analysis.service';
import { LayerService } from '../../../services/layer.service';
import type { OrganizationSelectItem } from '../../../types/organization.type';
import type { LayerSelectItem } from '../../../types/layer.type';
import FilterBuilder from './SpatialAnalysisFilter';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;

// ══════════ HELPERS ══════════

const opLabel = (ops: any[], op: number) => ops.find((o: any) => o.value === op)?.label ?? String(op);

// ══════════ MAIN COMPONENT ══════════

export default function SpatialAnalysisForm() {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const [organizations, setOrganizations] = useState<OrganizationSelectItem[]>([]);
  const [layers, setLayers] = useState<Record<string, LayerSelectItem[]>>({});
  const [analysisTypes, setAnalysisTypes] = useState<[]>([]);
  const [filterOperators, setFilterOperators] = useState<any[]>([]);

  const [srcOrgId, setSrcOrgId] = useState('');
  const [srcLayerId, setSrcLayerId] = useState('');
  const [srcFilters, setSrcFilters] = useState<SpatialAnalysisFilter[]>([]);

  const [targets, setTargets] = useState<SpatialAnalysisTarget[]>([]);
  const [tbOrgId, setTbOrgId] = useState('');
  const [tbLayerId, setTbLayerId] = useState('');
  const [tbFilters, setTbFilters] = useState<SpatialAnalysisFilter[]>([]);

  const srcOrg = organizations.find(o => o.id === srcOrgId);
  const srcLayer = srcOrgId && srcLayerId ? (layers[srcOrgId] ?? []).find(l => l.id === srcLayerId) : null;
  const tbLayer = tbOrgId && tbLayerId ? (layers[tbOrgId] ?? []).find(l => l.id === tbLayerId) : null;

  const getAllOrganizations = () => {
    OrganizationService.getAllOrganizations()
      .then((response) => { setOrganizations(response.data); })
      .catch((error) => { console.error(error); });
  };

  const setAllLayers = (organizationId: string) => {
    LayerService.getAllLayers(organizationId)
      .then((response) => {
        setLayers(prev => ({ ...prev, [organizationId]: response.data }));
      })
      .catch((error) => { console.error(error); });
  };

  const getAnalysisTypes = () => {
    SpatialAnalysisService.getSpatialAnalysisTypes()
      .then((response) => { setAnalysisTypes(response.data); })
      .catch((error) => { console.error(error); });
  };

  const getFilterOperators = () => {
    SpatialAnalysisService.getSpatialAnalysisFilterOperators()
      .then((response) => { setFilterOperators(response.data); })
      .catch((error) => { console.error(error); });
  };

  const handleAddTarget = () => {
    const org = organizations.find(o => o.id === tbOrgId);
    if (!tbLayer || !org) return;
    setTargets(p => [...p, { organizationId: org.id, layerId: tbLayer.id, filters: [...tbFilters] }]);
    setTbOrgId(''); setTbLayerId(''); setTbFilters([]);
  };

  const handleSave = () => {
    form.validateFields()
      .then((values) => {
        const body: SpatialAnalysisCreate = {
          name: values.name.trim(),
          type: values.type,
          description: values.description?.trim() ?? '',
          source: { organizationId: srcOrgId, layerId: srcLayerId, filters: srcFilters },
          targets: targets.map(t => ({ organizationId: t.organizationId, layerId: t.layerId, filters: t.filters })),
        };
        SpatialAnalysisService.createSpatialAnalysis(body)
          .then(() => {
            navigate(`/spatial-analyses`);
          }).catch((error) => {
            console.error(error);
          })
      });
  };

  useEffect(() => {
    getAllOrganizations();
    getAnalysisTypes();
    getFilterOperators();
  }, []);

  return (
    <>
      <Card title="Məkan Analizi Şablonu">
        <Form form={form} layout="vertical">

          {/* ── Ümumi ── */}
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item label="Ad" name="name" rules={[{ required: true, message: 'Ad daxil edin' }]}>
                <Input placeholder="Şablon adı" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="Təsvir" name="description">
                <TextArea placeholder="İxtiyari" autoSize={{ minRows: 1, maxRows: 2 }} />
              </Form.Item>
            </Col>

            <Col span={8}>
              <Form.Item label="Analiz növü" name="type" rules={[{ required: true, message: 'Analiz növü seçin' }]}>
                <Select
                  placeholder="Seçin..."
                  allowClear
                  options={analysisTypes.map((a: any) => ({ value: a.id, label: a.value }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* ── Mənbə ── */}
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item label="Mənbə təşkilat" required>
                <Select
                  placeholder="Təşkilat"
                  value={srcOrgId || undefined}
                  onChange={(v) => {
                    setSrcOrgId(v ?? '');
                    if (v) setAllLayers(v);
                    setSrcLayerId(''); setSrcFilters([]);
                  }}
                  allowClear
                  options={organizations.map(org => ({ value: org.id, label: org.value }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Mənbə layer" required>
                <Select
                  placeholder="Layer"
                  disabled={!srcOrgId}
                  value={srcLayerId || undefined}
                  onChange={(v) => { setSrcLayerId(v ?? ''); setSrcFilters([]); }}
                  allowClear
                  options={srcOrgId ? (layers[srcOrgId] ?? []).map(l => ({ value: l.id, label: l.value })) : []}
                />
              </Form.Item>
            </Col>
          </Row>

          {srcLayer && srcOrg && (
            <>
              <Alert type="info" showIcon style={{ marginBottom: 8 }} message={`${srcOrg.value} › ${srcLayer.value}`} />
              <FilterBuilder filterOperators={filterOperators} filters={srcFilters} onFiltersChange={setSrcFilters} />
            </>
          )}

          <Divider />

          {/* ── Hədəflər ── */}
          {targets.map((t, i) => {
            const tOrg = organizations.find(o => o.id === t.organizationId);
            const tLayer = (layers[t.organizationId] ?? []).find(l => l.id === t.layerId);
            return (
              <Alert key={i} type="warning" style={{ marginBottom: 4 }} closable
                onClose={() => setTargets(p => p.filter((_, idx) => idx !== i))}
                message={<>
                  <strong>{i + 1}.</strong> {tOrg?.value ?? t.organizationId} › {tLayer?.value ?? t.layerId}
                  {t.filters.length > 0 && t.filters.map((f, fi) => (
                    <Tag key={fi} color="warning" style={{ fontFamily: 'monospace', fontSize: 10, marginLeft: 4 }}>
                      {f.value ? `${f.attribute} ${opLabel(filterOperators, f.operation)} ${f.value}` : `${f.attribute} ${opLabel(filterOperators, f.operation)}`}
                    </Tag>
                  ))}
                </>}
              />
            );
          })}

          <Row gutter={12} style={{ marginTop: 8 }}>
            <Col span={10}>
              <Select size="small" style={{ width: '100%' }} placeholder="Təşkilat" value={tbOrgId || undefined}
                onChange={(v: any) => {
                  setTbOrgId(v ?? '');
                  if (v) setAllLayers(v);
                  setTbLayerId(''); setTbFilters([]);
                }}
                allowClear options={organizations.map(org => ({ value: org.id, label: org.value }))} />
            </Col>
            <Col span={10}>
              <Select size="small" style={{ width: '100%' }} placeholder="Layer" disabled={!tbOrgId}
                value={tbLayerId || undefined}
                onChange={v => { setTbLayerId(v ?? ''); setTbFilters([]); }}
                allowClear options={tbOrgId ? (layers[tbOrgId] ?? []).map(l => ({ value: l.id, label: l.value })) : []} />
            </Col>
            <Col span={4}>
              <Button size="small" type="primary" icon={<PlusOutlined />} disabled={!tbLayerId} onClick={handleAddTarget} block>
                Əlavə et
              </Button>
            </Col>
          </Row>

          {tbLayer && (
            <FilterBuilder filterOperators={filterOperators} filters={tbFilters} onFiltersChange={setTbFilters} />
          )}

          {/* ── Save ── */}
          <Divider />
          <Row justify="end">
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>Saxla</Button>
          </Row>

        </Form>
      </Card>
    </>
  );
}