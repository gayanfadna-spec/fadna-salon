import sys

file_path = r"c:\FADNA\Salon\frontend\src\pages\AdminDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace state initializations
content = content.replace(
    "const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber: '' });",
    "const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });"
)

# Add expandedSalonId state
if "const [expandedSalonId, setExpandedSalonId] = useState(null);" not in content:
    content = content.replace(
        "const [editingSalonId, setEditingSalonId] = useState(null);",
        "const [editingSalonId, setEditingSalonId] = useState(null);\n    const [expandedSalonId, setExpandedSalonId] = useState(null);"
    )

# Replace handleEditClick
old_edit_click = """    const handleEditClick = (salon) => {
        setNewSalon({
            name: salon.name,
            location: salon.location,
            contactNumber: salon.contactNumber
        });"""

new_edit_click = """    const handleEditClick = (salon) => {
        setNewSalon({
            name: salon.name,
            location: salon.location || '',
            contactNumber1: salon.contactNumber1 || salon.contactNumber || '',
            contactNumber2: salon.contactNumber2 || '',
            remark: salon.remark || '',
            accountDetails: salon.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' }
        });"""
content = content.replace(old_edit_click, new_edit_click)

# Replace newSalon form
old_form = """                            <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                                <input
                                    type="text"
                                    placeholder="Salon Name"
                                    value={newSalon.name}
                                    onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })}
                                    required
                                />
                                <input
                                    type="text"
                                    placeholder="Location"
                                    value={newSalon.location}
                                    onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Contact Number"
                                    value={newSalon.contactNumber}
                                    onChange={(e) => setNewSalon({ ...newSalon, contactNumber: e.target.value })}
                                />
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: editingSalonId ? '0.5rem' : '0' }}>
                                    {editingSalonId ? 'Update Salon' : 'Generate QR Code'}
                                </button>
                                {editingSalonId && (
                                    <button
                                        type="button"
                                        className="btn-primary outline"
                                        style={{ width: '100%' }}
                                        onClick={handleCancelEdit}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>"""

new_form = """                            <form onSubmit={editingSalonId ? handleUpdateSalon : handleCreateSalon}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <input type="text" placeholder="Salon Name *" value={newSalon.name} onChange={(e) => setNewSalon({ ...newSalon, name: e.target.value })} required />
                                    <input type="text" placeholder="Location" value={newSalon.location} onChange={(e) => setNewSalon({ ...newSalon, location: e.target.value })} />
                                    <input type="text" placeholder="Contact Number 1" value={newSalon.contactNumber1} onChange={(e) => setNewSalon({ ...newSalon, contactNumber1: e.target.value })} />
                                    <input type="text" placeholder="Contact Number 2" value={newSalon.contactNumber2} onChange={(e) => setNewSalon({ ...newSalon, contactNumber2: e.target.value })} />
                                    <input type="text" placeholder="Remark" value={newSalon.remark} onChange={(e) => setNewSalon({ ...newSalon, remark: e.target.value })} style={{ gridColumn: '1 / -1' }} />
                                </div>
                                <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Account Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <input type="text" placeholder="Bank Name" value={newSalon.accountDetails.bankName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, bankName: e.target.value } })} />
                                    <input type="text" placeholder="Branch" value={newSalon.accountDetails.branch} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, branch: e.target.value } })} />
                                    <input type="text" placeholder="Account Number" value={newSalon.accountDetails.accountNumber} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountNumber: e.target.value } })} />
                                    <input type="text" placeholder="Account Name" value={newSalon.accountDetails.accountName} onChange={(e) => setNewSalon({ ...newSalon, accountDetails: { ...newSalon.accountDetails, accountName: e.target.value } })} />
                                </div>
                                <button type="submit" className="btn-primary" style={{ width: '100%', marginBottom: editingSalonId ? '0.5rem' : '0' }}>
                                    {editingSalonId ? 'Update Salon' : 'Generate QR Code'}
                                </button>
                                {editingSalonId && (
                                    <button
                                        type="button"
                                        className="btn-primary outline"
                                        style={{ width: '100%' }}
                                        onClick={handleCancelEdit}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>"""
content = content.replace(old_form, new_form)

# Add expanded card details
old_card_end = """                                                    <div className="credential-box">
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>User:</span>
                                                            <span className="mono-text">{salon.username}</span>
                                                        </div>
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>Pass:</span>
                                                            <span className="mono-text" style={{ color: salon.plainPassword ? '#4ade80' : 'inherit' }}>
                                                                {salon.plainPassword || '••••••'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="card-actions">
                                                        <button
                                                            onClick={() => handleDownloadQR(salon)}"""

new_card_end = """                                                    <div className="credential-box">
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>User:</span>
                                                            <span className="mono-text">{salon.username}</span>
                                                        </div>
                                                        <div className="credential-row">
                                                            <span style={{ opacity: 0.6 }}>Pass:</span>
                                                            <span className="mono-text" style={{ color: salon.plainPassword ? '#4ade80' : 'inherit' }}>
                                                                {salon.plainPassword || '••••••'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {expandedSalonId === salon._id && (
                                                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', fontSize: '0.85rem' }}>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Contact 1:</strong> {salon.contactNumber1 || salon.contactNumber || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Contact 2:</strong> {salon.contactNumber2 || 'N/A'}</p>
                                                                <p style={{ margin: '0.2rem 0' }}><strong>Remark:</strong> {salon.remark || 'N/A'}</p>
                                                                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Bank:</strong> {salon.accountDetails?.bankName || 'N/A'}</p>
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Branch:</strong> {salon.accountDetails?.branch || 'N/A'}</p>
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Account No:</strong> {salon.accountDetails?.accountNumber || 'N/A'}</p>
                                                                    <p style={{ margin: '0.2rem 0' }}><strong>Account Name:</strong> {salon.accountDetails?.accountName || 'N/A'}</p>
                                                                </div>
                                                        </div>
                                                    )}

                                                    <div className="card-actions">
                                                        <button
                                                            onClick={() => setExpandedSalonId(expandedSalonId === salon._id ? null : salon._id)}
                                                            className="icon-btn info"
                                                            title="Toggle Details"
                                                            style={{ border: '1px solid rgba(255,255,255,0.2)' }}
                                                        >
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownloadQR(salon)}"""

content = content.replace(old_card_end, new_card_end)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done updating AdminDashboard.jsx")
