import { useState, useEffect } from 'react';
import {
  Container, Table, Button, Form, Row, Col, Alert, Tabs, Tab, Spinner, Modal, Badge, InputGroup, Card, OverlayTrigger, Tooltip, Offcanvas
} from 'react-bootstrap';
import Navbar from '../components/Navbar';
import Head from 'next/head';

const UNIT_OPTIONS = ['kg', 'g', 'L', 'ml', 'pcs', 'pack', 'dozen', 'other'];

export default function GroceryPage() {
  // States
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState('');
  const [showAddEdit, setShowAddEdit] = useState(false);
  const [editIndex, setEditIndex] = useState(null);
  const [modalItem, setModalItem] = useState({ name: '', quantity: '', unit: '', minStock: '', note: '' });
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState('stock');
  const [toast, setToast] = useState({ show: false, type: '', msg: '' });
  const [dark, setDark] = useState(false);

  // Sabha
  const [sabhaRecords, setSabhaRecords] = useState([]);
  const [sabhaLoading, setSabhaLoading] = useState(true);
  const [sabhaError, setSabhaError] = useState('');
  const [newSabha, setNewSabha] = useState({ date: '', menu: '', groceriesUsed: [] });
  const [sabhaGrocery, setSabhaGrocery] = useState({ name: '', quantity: '', unit: '' });
  const [sabhaDeleteLoading, setSabhaDeleteLoading] = useState(null);

  // Fetch items
  useEffect(() => {
    setItemsLoading(true);
    fetch('/api/grocery')
      .then(res => res.json())
      .then(data => {
        setItems(data.items || []);
        setItemsLoading(false);
      })
      .catch(() => {
        setItemsError('Failed to load grocery items');
        setItemsLoading(false);
      });
  }, []);

  // Fetch sabha
  useEffect(() => {
    setSabhaLoading(true);
    fetch('/api/sabha-grocery')
      .then(res => res.json())
      .then(data => {
        setSabhaRecords(data.records || []);
        setSabhaLoading(false);
      })
      .catch(() => {
        setSabhaError('Failed to load sabha records');
        setSabhaLoading(false);
      });
  }, []);

  // Dashboard data
  const lowStockCount = items.filter(item => item.minStock && item.quantity <= item.minStock).length;
  const toBuyCount = items.filter(item => item.toBuy).length;

  // Modal helpers
  const openAddModal = () => {
    setModalItem({ name: '', quantity: '', unit: '', minStock: '', note: '' });
    setEditIndex(null);
    setShowAddEdit(true);
  };
  const openEditModal = idx => {
    setModalItem(items[idx]);
    setEditIndex(idx);
    setShowAddEdit(true);
  };

  // Add/Edit submit
  const handleModalSave = async () => {
    if (!modalItem.name || !modalItem.quantity || !modalItem.unit) return;
    if (editIndex === null) {
      // Add
      try {
        const res = await fetch('/api/grocery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modalItem, quantity: Number(modalItem.quantity), minStock: Number(modalItem.minStock) || 0 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to add item');
        setItems([...items, data.item]);
        setShowAddEdit(false);
        setToast({ show: true, type: 'success', msg: 'Added new grocery item!' });
      } catch (err) {
        setItemsError(err.message);
      }
    } else {
      // Edit
      try {
        const res = await fetch(`/api/grocery?id=${modalItem._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...modalItem, quantity: Number(modalItem.quantity), minStock: Number(modalItem.minStock) || 0 })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to update item');
        const updated = [...items];
        updated[editIndex] = data.item;
        setItems(updated);
        setShowAddEdit(false);
        setToast({ show: true, type: 'success', msg: 'Changes saved.' });
      } catch (err) {
        setItemsError(err.message);
      }
    }
  };

  // Delete item
  const handleDeleteItem = async idx => {
    const id = items[idx]._id;
    try {
      const res = await fetch(`/api/grocery?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete item');
      setItems(items.filter((_, i) => i !== idx));
      setToast({ show: true, type: 'danger', msg: 'Deleted grocery item.' });
    } catch (err) {
      setItemsError(err.message);
    }
  };

  // Toggle buy
  const handleToggleToBuy = async idx => {
    const item = items[idx];
    try {
      const res = await fetch(`/api/grocery?id=${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, toBuy: !item.toBuy })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update item');
      const updated = [...items];
      updated[idx] = data.item;
      setItems(updated);
    } catch (err) {
      setItemsError(err.message);
    }
  };

  // Filter
  const filteredItems = items.filter(
    i =>
      (!filter || i.name.toLowerCase().includes(filter.toLowerCase()) || (i.unit && i.unit.toLowerCase().includes(filter.toLowerCase())))
  );

  // Bulk actions
  const handleBulkDeleteToBuy = async () => {
    const toDelete = items.filter(i => i.toBuy);
    for (let item of toDelete) {
      await fetch(`/api/grocery?id=${item._id}`, { method: 'DELETE' });
    }
    setItems(items.filter(i => !i.toBuy));
    setToast({ show: true, type: 'danger', msg: 'Deleted all "To Buy" items.' });
  };
  const handleBulkMarkBought = async () => {
    await Promise.all(
      items.filter(i => i.toBuy).map(i =>
        fetch(`/api/grocery?id=${i._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...i, toBuy: false })
        })
      )
    );
    setItems(items.map(i => ({ ...i, toBuy: false })));
    setToast({ show: true, type: 'success', msg: 'Marked all as bought.' });
  };

  // Sabha features
  const handleAddSabhaGrocery = () => {
    if (!sabhaGrocery.name || !sabhaGrocery.quantity || !sabhaGrocery.unit) return;
    setNewSabha({
      ...newSabha,
      groceriesUsed: [...(newSabha.groceriesUsed || []), { ...sabhaGrocery, quantity: Number(sabhaGrocery.quantity) }]
    });
    setSabhaGrocery({ name: '', quantity: '', unit: '' });
  };
  const handleAddSabha = async () => {
    if (!newSabha.date || !newSabha.menu) return;
    try {
      const res = await fetch('/api/sabha-grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSabha)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add sabha record');
      setSabhaRecords([data.record, ...sabhaRecords]);
      setItems(items.map(item => {
        const used = (newSabha.groceriesUsed || []).find(g => g.name === item.name);
        if (used) {
          return { ...item, quantity: Math.max(0, item.quantity - used.quantity) };
        }
        return item;
      }));
      setNewSabha({ date: '', menu: '', groceriesUsed: [] });
      setToast({ show: true, type: 'success', msg: 'Sabha recorded!' });
    } catch (err) {
      setSabhaError(err.message);
    }
  };
  const handleDeleteSabha = async id => {
    setSabhaDeleteLoading(id);
    try {
      const res = await fetch(`/api/sabha-grocery?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete sabha record');
      setSabhaRecords(sabhaRecords.filter(rec => rec._id !== id));
      setToast({ show: true, type: 'danger', msg: 'Sabha record deleted.' });
    } catch (err) {
      setSabhaError(err.message);
    } finally {
      setSabhaDeleteLoading(null);
    }
  };

  const shoppingList = items.filter(item => item.toBuy || (item.minStock && item.quantity <= item.minStock));

  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const t = setTimeout(() => setToast({ ...toast, show: false }), 2300);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Auto dark mode
  useEffect(() => {
    setDark(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  // Stats with animation
  function AnimatedStat({ end }) {
    const [val, setVal] = useState(0);
    useEffect(() => {
      let v = 0, frame;
      function step() {
        v += Math.ceil((end - v) / 6);
        setVal(v);
        if (v !== end) frame = requestAnimationFrame(step);
      }
      step();
      return () => cancelAnimationFrame(frame);
    }, [end]);
    return <span>{val}</span>;
  }

  return (
    <>
      <Head>
        <title>Grocery Management - HSAPSS Windsor</title>
      </Head>
      <Navbar />
      <div className={dark ? "glass-bg dark-bg" : "glass-bg"}>
        <Container className="py-4">
          {/* HEADER */}
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between mb-3 gap-3">
            <h2 className="fw-bolder mb-0" style={{ letterSpacing: 1, color: dark ? '#fff' : '#2b2243' }}>🛒 Grocery Dashboard</h2>
            <Button onClick={() => setDark(!dark)} className="rounded-pill" variant={dark ? "light" : "dark"} size="sm">
              <i className={`fas fa-${dark ? "sun" : "moon"}`}></i>
            </Button>
          </div>
          {/* DASHBOARD MINI-STATS */}
          <Row className="mb-4 g-3">
            <Col xs={12} sm={4}>
              <Card className="glass-card stat-card border-0">
                <Card.Body>
                  <div className="stat-number"><AnimatedStat end={items.length} /></div>
                  <div className="stat-label">Total Items</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={4}>
              <Card className="glass-card stat-card border-0">
                <Card.Body>
                  <div className="stat-number text-warning"><AnimatedStat end={lowStockCount} /></div>
                  <div className="stat-label">Low Stock</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={6} sm={4}>
              <Card className="glass-card stat-card border-0">
                <Card.Body>
                  <div className="stat-number text-danger"><AnimatedStat end={toBuyCount} /></div>
                  <div className="stat-label">To Buy</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          {/* TABS */}
          <Tabs activeKey={tab} onSelect={setTab} className="mb-3 glass-tabs sticky-top">
            <Tab eventKey="stock" title="Stock">
              <div className="mb-3 d-flex flex-wrap gap-2 align-items-center">
                <InputGroup style={{ maxWidth: 320 }}>
                  <InputGroup.Text><i className="fas fa-search"></i></InputGroup.Text>
                  <Form.Control
                    placeholder="Filter groceries…"
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                  />
                </InputGroup>
                <OverlayTrigger placement="top" overlay={<Tooltip>Add new grocery</Tooltip>}>
                  <Button className="rounded-pill fw-bold glass-btn" variant="success" onClick={openAddModal}><i className="fas fa-plus"></i> Add Grocery</Button>
                </OverlayTrigger>
                <Button className="rounded-pill glass-btn" variant="outline-danger" onClick={handleBulkDeleteToBuy} disabled={!toBuyCount}>
                  <i className="fas fa-trash me-1"></i> Delete All "To Buy"
                </Button>
                <Button className="rounded-pill glass-btn" variant="outline-primary" onClick={handleBulkMarkBought} disabled={!toBuyCount}>
                  <i className="fas fa-check me-1"></i> Mark All Bought
                </Button>
              </div>
              <div className="glass-table-responsive mb-5">
                {itemsLoading ? (
                  <div className="text-center py-5"><Spinner animation="border" /></div>
                ) : itemsError ? (
                  <Alert variant="danger">{itemsError}</Alert>
                ) : (
                  <Table bordered hover responsive className="glass-table align-middle">
                    <thead className="table-light sticky-top glass-thead">
                      <tr>
                        <th>Name</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Min</th>
                        <th>Status</th>
                        <th>To Buy</th>
                        <th style={{ width: 120 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length === 0 && (
                        <tr>
                          <td colSpan={7} className="empty-state-td">
                            <div className="empty-art mb-2">🍎</div>
                            <div className="text-muted">No groceries found</div>
                          </td>
                        </tr>
                      )}
                      {filteredItems.map((item, idx) => {
                        const isLow = item.minStock && item.quantity <= item.minStock;
                        return (
                          <tr key={item._id} className="glass-row">
                            <td>
                              <span className="avatar-circle me-2">{item.name[0]?.toUpperCase() || '?'}</span>
                              <b>{item.name}</b>
                              {item.note && <span className="badge bg-info ms-2 glass-badge">{item.note}</span>}
                            </td>
                            <td>{item.quantity}</td>
                            <td>{item.unit}</td>
                            <td>{item.minStock || 0}</td>
                            <td>
                              {item.toBuy ? (
                                <Badge bg="danger" className="glow-badge"><i className="fas fa-shopping-cart me-1"></i>To Buy</Badge>
                              ) : isLow ? (
                                <Badge bg="warning" text="dark" className="glow-badge"><i className="fas fa-exclamation-triangle me-1"></i>Low</Badge>
                              ) : (
                                <Badge bg="success" className="glow-badge"><i className="fas fa-check me-1"></i>In Stock</Badge>
                              )}
                            </td>
                            <td>
                              <Form.Check
                                type="switch"
                                id={`toBuySwitch${item._id}`}
                                checked={!!item.toBuy}
                                onChange={() => handleToggleToBuy(items.indexOf(item))}
                                style={{ fontSize: 18 }}
                              />
                            </td>
                            <td className="action-cell">
                              <Button size="sm" variant="outline-primary" className="me-2"
                                onClick={() => openEditModal(items.indexOf(item))} title="Edit"><i className="fas fa-edit"></i></Button>
                              <Button size="sm" variant="outline-danger"
                                onClick={() => handleDeleteItem(items.indexOf(item))} title="Delete"><i className="fas fa-trash"></i></Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                )}
              </div>
            </Tab>
            <Tab eventKey="shopping" title="Shopping List">
              <Table bordered responsive hover className="align-middle glass-table">
                <thead className="table-light sticky-top glass-thead"><tr><th>Name</th><th>Qty</th><th>Unit</th><th>Min</th></tr></thead>
                <tbody>
                  {shoppingList.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="empty-state-td">
                        <div className="empty-art mb-2">🛍️</div>
                        <div className="text-muted">No items to buy. All stocks are sufficient!</div>
                      </td>
                    </tr>
                  ) : (
                    shoppingList.map((item, idx) => (
                      <tr key={item._id}>
                        <td>{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>{item.minStock}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </Tab>
            <Tab eventKey="sabha" title="Sabha Usage / History">
              <Card className="mb-3 glass-card">
                <Card.Header className="gradient-header">
                  Record Sabha Dinner
                </Card.Header>
                <Card.Body>
                  <Row className="g-2 align-items-end mb-3">
                    <Col md={3}><Form.Control size="sm" type="date" value={newSabha.date} onChange={e => setNewSabha({ ...newSabha, date: e.target.value })} /></Col>
                    <Col md={3}><Form.Control size="sm" placeholder="Menu (e.g., Pav Bhaji)" value={newSabha.menu} onChange={e => setNewSabha({ ...newSabha, menu: e.target.value })} /></Col>
                    <Col md={2}><Form.Control size="sm" placeholder="Grocery Name" value={sabhaGrocery.name} onChange={e => setSabhaGrocery({ ...sabhaGrocery, name: e.target.value })} /></Col>
                    <Col md={2}><Form.Control size="sm" type="number" placeholder="Qty Used" value={sabhaGrocery.quantity} onChange={e => setSabhaGrocery({ ...sabhaGrocery, quantity: e.target.value })} /></Col>
                    <Col md={1}><Form.Control size="sm" placeholder="Unit" value={sabhaGrocery.unit} onChange={e => setSabhaGrocery({ ...sabhaGrocery, unit: e.target.value })} /></Col>
                    <Col md={1}><Button size="sm" variant="secondary" onClick={handleAddSabhaGrocery}>Add</Button></Col>
                  </Row>
                  {newSabha.groceriesUsed && newSabha.groceriesUsed.length > 0 && (
                    <Table bordered size="sm" className="mb-3 glass-table">
                      <thead><tr><th>Grocery</th><th>Qty Used</th><th>Unit</th></tr></thead>
                      <tbody>
                        {newSabha.groceriesUsed.map((g, idx) => (
                          <tr key={idx}><td>{g.name}</td><td>{g.quantity}</td><td>{g.unit}</td></tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                  <Button size="sm" variant="success" className="rounded-pill" onClick={handleAddSabha}>Save Sabha Record</Button>
                </Card.Body>
              </Card>
              <h5 className="mb-3 fw-semibold" style={{ color: dark ? '#d7e0f8' : '#294375' }}>Sabha Usage Timeline</h5>
              {sabhaLoading ? (
                <div className="text-center py-4"><Spinner animation="border" /></div>
              ) : sabhaError ? (
                <Alert variant="danger">{sabhaError}</Alert>
              ) : (
                <div className="sabha-timeline">
                  {sabhaRecords.length === 0 ? (
                    <Alert variant="info">No Sabha records yet.</Alert>
                  ) : (
                    sabhaRecords.map((rec, i) => (
                      <div key={rec._id} className="sabha-timeline-item">
                        <div className="sabha-dot"></div>
                        <div className="sabha-content glass-card">
                          <div className="fw-bold">{rec.menu}</div>
                          <div className="small text-muted mb-1">
                            {rec.date
                              ? (() => {
                                  const d = new Date(rec.date);
                                  if (isNaN(d.getTime())) {
                                    return rec.date.slice(0, 10);
                                  }
                                  return d.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
                                })()
                              : ''}
                          </div>
                          <div className="mb-1">
                            <span className="text-muted small">Used: </span>
                            {(rec.groceriesUsed || []).map((g, j) => (
                              <Badge key={j} bg="info" text="dark" className="me-2 glass-badge">{g.name} {g.quantity} {g.unit}</Badge>
                            ))}
                          </div>
                          <Button size="sm" variant="danger" className="mt-1"
                            onClick={() => handleDeleteSabha(rec._id)}
                            disabled={sabhaDeleteLoading === rec._id}>
                            {sabhaDeleteLoading === rec._id ? <Spinner animation="border" size="sm" /> : <i className="fas fa-trash"></i>}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </Tab>
          </Tabs>
        </Container>
        {/* Right Offcanvas Add/Edit Modal */}
        <Offcanvas show={showAddEdit} onHide={() => setShowAddEdit(false)} placement="end" className="glass-offcanvas">
          <Offcanvas.Header closeButton className="glass-offcanvas-header">
            <Offcanvas.Title>
              <i className={`fas fa-${editIndex !== null ? 'edit' : 'plus'} me-2`}></i>
              {editIndex !== null ? 'Edit Grocery' : 'Add Grocery'}
            </Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body className="glass-offcanvas-body">
            <Form>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Name</Form.Label>
                <Form.Control
                  size="lg"
                  type="text"
                  placeholder="Enter item name"
                  value={modalItem.name}
                  onChange={e => setModalItem({ ...modalItem, name: e.target.value })}
                  autoFocus
                  style={{ borderRadius: 12, fontSize: 18 }}
                />
              </Form.Group>
              <Row>
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Quantity</Form.Label>
                    <Form.Control
                      size="lg"
                      type="number"
                      placeholder="0"
                      min={0}
                      value={modalItem.quantity}
                      onChange={e => setModalItem({ ...modalItem, quantity: e.target.value })}
                      style={{ borderRadius: 12, fontSize: 18 }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Unit</Form.Label>
                    <Form.Select
                      size="lg"
                      value={modalItem.unit}
                      onChange={e => setModalItem({ ...modalItem, unit: e.target.value })}
                      style={{ borderRadius: 12, fontSize: 18 }}
                    >
                      <option value="">Select</option>
                      {UNIT_OPTIONS.map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold">Min Stock</Form.Label>
                    <Form.Control
                      size="lg"
                      type="number"
                      placeholder="0"
                      min={0}
                      value={modalItem.minStock}
                      onChange={e => setModalItem({ ...modalItem, minStock: e.target.value })}
                      style={{ borderRadius: 12, fontSize: 18 }}
                    />
                  </Form.Group>
                </Col>
              </Row>
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Note</Form.Label>
                <Form.Control
                  size="lg"
                  type="text"
                  placeholder="e.g. half a 10lb bag left"
                  value={modalItem.note || ''}
                  onChange={e => setModalItem({ ...modalItem, note: e.target.value })}
                  style={{ borderRadius: 12, fontSize: 18 }}
                />
              </Form.Group>
              <div className="d-flex gap-2 justify-content-end pt-2">
                <Button variant="outline-secondary" size="lg" onClick={() => setShowAddEdit(false)} style={{ borderRadius: 8 }}>Cancel</Button>
                <Button variant="success" size="lg" style={{ borderRadius: 8, minWidth: 120 }} onClick={handleModalSave}>
                  <i className={`fas fa-${editIndex !== null ? 'save' : 'plus'} me-2`}></i>
                  {editIndex !== null ? 'Save Changes' : 'Add Item'}
                </Button>
              </div>
            </Form>
          </Offcanvas.Body>
        </Offcanvas>
        {/* Toast Notification */}
        {toast.show && (
          <div className={`position-fixed bottom-0 end-0 p-4 z-3`} style={{ minWidth: 220 }}>
            <Alert variant={toast.type} className="d-flex align-items-center shadow-lg border-0" onClose={() => setToast({ ...toast, show: false })} dismissible>
              <i className={`fas fa-${toast.type === 'danger' ? 'times-circle' : 'check-circle'} me-2`}></i>
              <div>{toast.msg}</div>
            </Alert>
          </div>
        )}
      </div>
      {/* Modern Glass Styles */}
      <style jsx global>{`
        body, .glass-bg {
          background: linear-gradient(135deg,#e8efff 0%,#f4f6fa 80%);
          min-height: 100vh;
        }
        .dark-bg, .glass-bg.dark-bg {
          background: linear-gradient(135deg,#181e2b 0%,#36405b 100%) !important;
          color: #e9ecf7;
        }
        .glass-card, .glass-table, .glass-thead, .glass-table-responsive, .glass-offcanvas, .glass-offcanvas-body {
          background: #ffffff !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          border: 1px solid rgba(15,23,42,0.08) !important;
        }
        .dark-bg .glass-card, .dark-bg .glass-table, .dark-bg .glass-thead, .dark-bg .glass-table-responsive, .dark-bg .glass-offcanvas, .dark-bg .glass-offcanvas-body {
          background: #22263b !important;
          color: #f7fafc;
        }
        .glass-card { border-radius: 18px !important; box-shadow: 0 4px 24px rgba(0,0,0,0.13) !important; }
        .stat-card { min-height: 94px; text-align: center; }
        .stat-number { font-size: 2.5rem; font-weight: bold; }
        .stat-label { font-size: 1.12rem; color: #7782a5; letter-spacing: 0.05em; }
        .glass-table { border-radius: 14px; box-shadow: 0 2px 16px rgba(60,80,120,0.07); }
        .glass-thead { background: linear-gradient(90deg,#c2e9fb 0%,#f9f6ff 100%); }
        .dark-bg .glass-thead { background: linear-gradient(90deg,#292945 0%,#223 100%); }
        .avatar-circle { display: inline-block; width: 33px; height: 33px; border-radius: 50%; background: #cee5fd; color: #223; font-weight: bold; line-height: 33px; text-align: center; font-size: 1.3em; }
        .dark-bg .avatar-circle { background: #24376b; color: #cbe6ff; }
        .glow-badge { box-shadow: 0 0 8px #dbeafe; font-weight: 500; }
        .glass-btn { box-shadow: 0 1px 6px rgba(44,164,255,0.07); font-weight: 500; }
        .glass-table-responsive { padding: 1rem 0.5rem 2.5rem 0.5rem; border-radius: 1.2rem; }
        .glass-row { transition: background 0.18s, transform 0.14s; }
        .glass-row:hover { background: #e0e7ef !important; transform: scale(1.012); }
        .dark-bg .glass-row:hover { background: #23243a !important; }
        .empty-state-td { text-align: center; padding: 1.8em 0.2em; background: transparent; }
        .empty-art { font-size: 2.2em; opacity: 0.65; }
        .gradient-header { background: linear-gradient(90deg,#79c2fa 0%,#e2d2fa 100%); color: #28345a; font-weight: 600; letter-spacing: 0.04em; }
        .sabha-timeline { border-left: 4px solid #bcdffb; margin-left: 10px; padding-left: 30px; }
        .sabha-timeline-item { position: relative; margin-bottom: 2.5rem; }
        .sabha-dot { position: absolute; left: -33px; top: 7px; width: 18px; height: 18px; background: #51cf66; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 4px #bcdffb; }
        .sabha-content { background: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(100,180,220,0.06); padding: 0.8rem 1.2rem; }
        .dark-bg .sabha-content { background: #2a2f45; }
        .glass-offcanvas { background: #ffffff !important; }
        .dark-bg .glass-offcanvas { background: #2a2f45 !important; }
        .glass-offcanvas-header, .glass-offcanvas-body { border: none !important; }
        @media (max-width: 600px) {
          .glass-table-responsive { padding: 0.5rem 0.05rem 3rem 0.05rem; border-radius: 0; }
          .stat-number { font-size: 2rem; }
          .glass-card { min-height: 60px; }
          .avatar-circle { width: 28px; height: 28px; font-size: 1em; }
        }
      `}</style>
    </>
  );
}
