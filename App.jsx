import React, { useEffect, useMemo, useState } from 'react';
import { QrCode, Package, Scissors, Archive, Search, Download, Trash2, Save, ClipboardList, AlertTriangle } from 'lucide-react';

const STORAGE_KEY = 'marble-factory-mobile-system-v1';

const initialData = {
  slabs: [
    { id: 'S001', material: 'Avant Quartz', lengthCm: 320, widthCm: 160, thickness: '20mm', location: 'Rack A1', status: 'available', remainingArea: 5.12, notes: '' },
    { id: 'S002', material: 'Ceramic', lengthCm: 320, widthCm: 160, thickness: '12mm', location: 'Rack B2', status: 'available', remainingArea: 5.12, notes: '' },
  ],
  cuts: [],
  offcuts: [],
};

function areaSqm(lengthCm, widthCm) {
  return Number(((lengthCm * widthCm) / 10000).toFixed(2));
}

function exportJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function badgeClass(status) {
  switch (status) {
    case 'available': return 'badge badge-green';
    case 'reserved': return 'badge badge-amber';
    case 'used': return 'badge badge-slate';
    case 'offcut': return 'badge badge-blue';
    default: return 'badge';
  }
}

function TabButton({ current, value, onClick, children }) {
  return (
    <button className={current === value ? 'tab active' : 'tab'} onClick={() => onClick(value)}>
      {children}
    </button>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="mini-card">
      <div className="muted">{label}</div>
      <div className="big-number">{value}</div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialData;
  });
  const [tab, setTab] = useState('scan');
  const [scanValue, setScanValue] = useState('');
  const [activeSlabId, setActiveSlabId] = useState('');
  const [jobName, setJobName] = useState('');
  const [operator, setOperator] = useState('');
  const [usedLength, setUsedLength] = useState('');
  const [usedWidth, setUsedWidth] = useState('');
  const [offcutLength, setOffcutLength] = useState('');
  const [offcutWidth, setOffcutWidth] = useState('');
  const [offcutLocation, setOffcutLocation] = useState('');
  const [search, setSearch] = useState('');
  const [newSlab, setNewSlab] = useState({ id: '', material: '', lengthCm: 320, widthCm: 160, thickness: '20mm', location: '', status: 'available', notes: '' });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const slabs = data.slabs;
  const activeSlab = useMemo(() => slabs.find((s) => s.id === activeSlabId), [slabs, activeSlabId]);

  const filteredSlabs = useMemo(() => {
    const q = search.toLowerCase().trim();
    return slabs.filter((s) =>
      s.id.toLowerCase().includes(q) ||
      s.material.toLowerCase().includes(q) ||
      s.location.toLowerCase().includes(q)
    );
  }, [slabs, search]);

  const totals = useMemo(() => {
    const totalSlabs = slabs.length;
    const available = slabs.filter((s) => s.status === 'available').length;
    const reserved = slabs.filter((s) => s.status === 'reserved').length;
    const offcuts = data.offcuts.length;
    return { totalSlabs, available, reserved, offcuts };
  }, [slabs, data.offcuts]);

  function handleScan() {
    const match = slabs.find((s) => s.id.toLowerCase() === scanValue.trim().toLowerCase());
    if (match) {
      setActiveSlabId(match.id);
      setTab('scan');
    } else {
      alert('Slab not found. Add it first or check the code.');
    }
  }

  function addSlab() {
    if (!newSlab.id || !newSlab.material || !newSlab.location) {
      alert('Please fill slab ID, material, and location.');
      return;
    }
    if (slabs.some((s) => s.id === newSlab.id)) {
      alert('Slab ID already exists.');
      return;
    }
    const slabArea = areaSqm(Number(newSlab.lengthCm), Number(newSlab.widthCm));
    setData((prev) => ({
      ...prev,
      slabs: [...prev.slabs, { ...newSlab, remainingArea: slabArea }],
    }));
    setNewSlab({ id: '', material: '', lengthCm: 320, widthCm: 160, thickness: '20mm', location: '', status: 'available', notes: '' });
    setTab('slabs');
  }

  function logCut() {
    if (!activeSlab || !jobName || !operator || !usedLength || !usedWidth) {
      alert('Select slab and complete job, operator, and used strip size.');
      return;
    }

    const usedArea = areaSqm(Number(usedLength), Number(usedWidth));
    const remainingArea = Math.max(0, Number((activeSlab.remainingArea - usedArea).toFixed(2)));

    setData((prev) => ({
      ...prev,
      cuts: [
        {
          id: `CUT-${Date.now()}`,
          date: new Date().toLocaleString(),
          slabId: activeSlab.id,
          jobName,
          operator,
          usedLength: Number(usedLength),
          usedWidth: Number(usedWidth),
          usedArea,
          remainingArea,
        },
        ...prev.cuts,
      ],
      slabs: prev.slabs.map((s) =>
        s.id === activeSlab.id
          ? {
              ...s,
              remainingArea,
              status: remainingArea === 0 ? 'used' : remainingArea < areaSqm(s.lengthCm, s.widthCm) ? 'offcut' : s.status,
            }
          : s
      ),
    }));

    setUsedLength('');
    setUsedWidth('');
    setJobName('');
  }

  function saveOffcut() {
    if (!activeSlab || !offcutLength || !offcutWidth || !offcutLocation) {
      alert('Select slab and complete offcut size and location.');
      return;
    }
    const offcutArea = areaSqm(Number(offcutLength), Number(offcutWidth));
    setData((prev) => ({
      ...prev,
      offcuts: [
        {
          id: `OFF-${Date.now()}`,
          slabId: activeSlab.id,
          material: activeSlab.material,
          lengthCm: Number(offcutLength),
          widthCm: Number(offcutWidth),
          area: offcutArea,
          location: offcutLocation,
          status: 'reusable',
          date: new Date().toLocaleString(),
        },
        ...prev.offcuts,
      ],
    }));
    setOffcutLength('');
    setOffcutWidth('');
    setOffcutLocation('');
    setTab('offcuts');
  }

  function removeSlab(id) {
    setData((prev) => ({ ...prev, slabs: prev.slabs.filter((s) => s.id !== id) }));
    if (activeSlabId === id) setActiveSlabId('');
  }

  return (
    <div className="app-shell">
      <header className="hero-card">
        <div className="hero-title"><QrCode size={26} /> Marble Factory Mobile Scanning System</div>
        <p className="hero-sub">Simple tablet-friendly slab tracking for the factory floor.</p>
        <div className="stats-grid">
          <StatCard label="Total Slabs" value={totals.totalSlabs} />
          <StatCard label="Available" value={totals.available} />
          <StatCard label="Reserved" value={totals.reserved} />
          <StatCard label="Offcuts" value={totals.offcuts} />
        </div>
      </header>

      <div className="tabs-wrap">
        <TabButton current={tab} value="scan" onClick={setTab}>Scan & Cut</TabButton>
        <TabButton current={tab} value="slabs" onClick={setTab}>Slabs</TabButton>
        <TabButton current={tab} value="offcuts" onClick={setTab}>Offcuts</TabButton>
        <TabButton current={tab} value="add" onClick={setTab}>Add Slab</TabButton>
        <TabButton current={tab} value="export" onClick={setTab}>Export</TabButton>
      </div>

      {tab === 'scan' && (
        <>
          <div className="grid two-col">
            <section className="card">
              <div className="section-title"><Search size={18} /> Scan or Enter Slab ID</div>
              <label className="label">Slab ID / QR value</label>
              <div className="inline-row">
                <input className="input" value={scanValue} onChange={(e) => setScanValue(e.target.value)} placeholder="Example: S001" />
                <button className="button" onClick={handleScan}>Find</button>
              </div>

              {activeSlab ? (
                <div className="selection-box">
                  <div className="selection-row">
                    <div>
                      <div className="selection-title">{activeSlab.id}</div>
                      <div className="muted">{activeSlab.material} · {activeSlab.lengthCm} x {activeSlab.widthCm} cm · {activeSlab.thickness}</div>
                    </div>
                    <span className={badgeClass(activeSlab.status)}>{activeSlab.status}</span>
                  </div>
                  <div className="muted">Location: <strong>{activeSlab.location}</strong></div>
                  <div className="muted">Remaining area: <strong>{activeSlab.remainingArea} sqm</strong></div>
                </div>
              ) : (
                <div className="empty-box">No slab selected yet.</div>
              )}
            </section>

            <section className="card">
              <div className="section-title"><Scissors size={18} /> Log Cut</div>
              <div className="grid two-col form-grid">
                <div>
                  <label className="label">Job Name</label>
                  <input className="input" value={jobName} onChange={(e) => setJobName(e.target.value)} placeholder="Kitchen Smith" />
                </div>
                <div>
                  <label className="label">Operator</label>
                  <input className="input" value={operator} onChange={(e) => setOperator(e.target.value)} placeholder="Mario" />
                </div>
                <div>
                  <label className="label">Used strip length (cm)</label>
                  <input className="input" type="number" value={usedLength} onChange={(e) => setUsedLength(e.target.value)} />
                </div>
                <div>
                  <label className="label">Used strip width/depth (cm)</label>
                  <input className="input" type="number" value={usedWidth} onChange={(e) => setUsedWidth(e.target.value)} />
                </div>
              </div>
              <button className="button wide" onClick={logCut}><Save size={16} /> Save Cut</button>
            </section>
          </div>

          <section className="card">
            <div className="section-title"><Archive size={18} /> Save Reusable Offcut</div>
            <div className="grid four-col form-grid">
              <div>
                <label className="label">Offcut length (cm)</label>
                <input className="input" type="number" value={offcutLength} onChange={(e) => setOffcutLength(e.target.value)} />
              </div>
              <div>
                <label className="label">Offcut width (cm)</label>
                <input className="input" type="number" value={offcutWidth} onChange={(e) => setOffcutWidth(e.target.value)} />
              </div>
              <div>
                <label className="label">Offcut location</label>
                <input className="input" value={offcutLocation} onChange={(e) => setOffcutLocation(e.target.value)} placeholder="Offcut Rack 2" />
              </div>
              <div className="action-col">
                <button className="button wide" onClick={saveOffcut}>Save Offcut</button>
              </div>
            </div>
          </section>
        </>
      )}

      {tab === 'slabs' && (
        <section className="card">
          <div className="section-title"><Package size={18} /> Slab Register</div>
          <input className="input search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by slab ID, material, or location" />
          <div className="list-wrap">
            {filteredSlabs.map((slab) => (
              <div className="list-card" key={slab.id}>
                <div>
                  <div className="selection-title">{slab.id} · {slab.material}</div>
                  <div className="muted">{slab.lengthCm} x {slab.widthCm} cm · {slab.thickness} · {slab.location}</div>
                  <div className="muted">Remaining: {slab.remainingArea} sqm</div>
                </div>
                <div className="inline-actions">
                  <span className={badgeClass(slab.status)}>{slab.status}</span>
                  <button className="button secondary" onClick={() => { setActiveSlabId(slab.id); setTab('scan'); }}>Select</button>
                  <button className="icon-button" onClick={() => removeSlab(slab.id)} aria-label="Delete slab"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'offcuts' && (
        <section className="card">
          <div className="section-title"><ClipboardList size={18} /> Reusable Offcuts</div>
          {data.offcuts.length === 0 ? (
            <div className="empty-box">No offcuts saved yet.</div>
          ) : (
            <div className="list-wrap">
              {data.offcuts.map((o) => (
                <div className="list-card" key={o.id}>
                  <div>
                    <div className="selection-title">{o.id} · {o.material}</div>
                    <div className="muted">From slab: {o.slabId}</div>
                    <div className="muted">{o.lengthCm} x {o.widthCm} cm · {o.area} sqm</div>
                    <div className="muted">Location: {o.location}</div>
                  </div>
                  <span className="badge badge-blue">reusable</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'add' && (
        <section className="card">
          <div className="section-title"><Package size={18} /> Add New Slab</div>
          <div className="grid three-col form-grid">
            <div>
              <label className="label">Slab ID</label>
              <input className="input" value={newSlab.id} onChange={(e) => setNewSlab({ ...newSlab, id: e.target.value })} />
            </div>
            <div>
              <label className="label">Material</label>
              <input className="input" value={newSlab.material} onChange={(e) => setNewSlab({ ...newSlab, material: e.target.value })} />
            </div>
            <div>
              <label className="label">Thickness</label>
              <input className="input" value={newSlab.thickness} onChange={(e) => setNewSlab({ ...newSlab, thickness: e.target.value })} />
            </div>
            <div>
              <label className="label">Length (cm)</label>
              <input className="input" type="number" value={newSlab.lengthCm} onChange={(e) => setNewSlab({ ...newSlab, lengthCm: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Width (cm)</label>
              <input className="input" type="number" value={newSlab.widthCm} onChange={(e) => setNewSlab({ ...newSlab, widthCm: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={newSlab.location} onChange={(e) => setNewSlab({ ...newSlab, location: e.target.value })} />
            </div>
            <div className="full-span">
              <label className="label">Notes</label>
              <textarea className="textarea" value={newSlab.notes} onChange={(e) => setNewSlab({ ...newSlab, notes: e.target.value })} />
            </div>
          </div>
          <button className="button" onClick={addSlab}><Save size={16} /> Add Slab</button>
        </section>
      )}

      {tab === 'export' && (
        <div className="grid two-col">
          <section className="card">
            <div className="section-title"><Download size={18} /> Export Data</div>
            <button className="button wide" onClick={() => exportJson(data, 'marble-factory-data.json')}><Download size={16} /> Export JSON Backup</button>
            <p className="muted top-gap">Use this to save or share your latest mobile data.</p>
          </section>
          <section className="card">
            <div className="section-title"><AlertTriangle size={18} /> Daily Use Tips</div>
            <ol className="tips-list">
              <li>Scan slab before every cut.</li>
              <li>Record actual strip length and width used.</li>
              <li>Save any reusable offcut immediately.</li>
              <li>Keep location updated whenever material moves.</li>
            </ol>
          </section>
        </div>
      )}
    </div>
  );
}
