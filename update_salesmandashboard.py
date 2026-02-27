import sys

file_path = r"c:\FADNA\Salon\frontend\src\pages\SalesmanDashboard.jsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace state initializations
content = content.replace(
    "const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber: '' });",
    "const [newSalon, setNewSalon] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });"
)
content = content.replace(
    "const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber: '' });",
    "const [editFormData, setEditFormData] = useState({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });"
)

# Add expandedSalonId state
if "const [expandedSalonId, setExpandedSalonId] = useState(null);" not in content:
    content = content.replace(
        "const [editingSalonId, setEditingSalonId] = useState(null);",
        "const [editingSalonId, setEditingSalonId] = useState(null);\n    const [expandedSalonId, setExpandedSalonId] = useState(null);"
    )

# Replace handleCreateSalon state reset
content = content.replace(
    "setNewSalon({ name: '', location: '', contactNumber: '' });",
    "setNewSalon({ name: '', location: '', contactNumber1: '', contactNumber2: '', remark: '', accountDetails: { bankName: '', branch: '', accountNumber: '', accountName: '' } });"
)

# Replace startEditing
old_start_editing = """    const startEditing = (salon) => {
        setEditingSalonId(salon._id);
        setEditFormData({
            name: salon.name,
            location: salon.location || '',
            contactNumber: salon.contactNumber || ''
        });
        // Scroll to form or show modal? Let's use a conditional section above the table
    };"""

new_start_editing = """    const startEditing = (salon) => {
        setEditingSalonId(salon._id);
        setEditFormData({
            name: salon.name,
            location: salon.location || '',
            contactNumber1: salon.contactNumber1 || salon.contactNumber || '',
            contactNumber2: salon.contactNumber2 || '',
            remark: salon.remark || '',
            accountDetails: salon.accountDetails || { bankName: '', branch: '', accountNumber: '', accountName: '' }
        });
    };"""
content = content.replace(old_start_editing, new_start_editing)

# Replace handleCreateSalon form
old_create_form = """                        <input
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
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                            Generate QR Code
                        </button>"""

new_create_form = """                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                        <button type="submit" className="btn-primary" style={{ width: '100%' }}>
                            Generate QR Code
                        </button>"""
content = content.replace(old_create_form, new_create_form)

# Replace update form
old_update_form = """                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Salon Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.name}
                                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Location</label>
                                    <input
                                        type="text"
                                        value={editFormData.location}
                                        onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Contact Number</label>
                                <input
                                    type="text"
                                    value={editFormData.contactNumber}
                                    onChange={(e) => setEditFormData({ ...editFormData, contactNumber: e.target.value })}
                                    required
                                />
                            </div>"""

new_update_form = """                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Salon Name</label><input type="text" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} required /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Location</label><input type="text" value={editFormData.location} onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })} required /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Contact Number 1</label><input type="text" value={editFormData.contactNumber1} onChange={(e) => setEditFormData({ ...editFormData, contactNumber1: e.target.value })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Contact Number 2</label><input type="text" value={editFormData.contactNumber2} onChange={(e) => setEditFormData({ ...editFormData, contactNumber2: e.target.value })} /></div>
                                <div style={{ gridColumn: '1 / -1' }}><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Remark</label><input type="text" value={editFormData.remark} onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })} /></div>
                            </div>
                            <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: '1.1rem' }}>Account Details</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Bank Name</label><input type="text" value={editFormData.accountDetails.bankName} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, bankName: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Branch</label><input type="text" value={editFormData.accountDetails.branch} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, branch: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Account Number</label><input type="text" value={editFormData.accountDetails.accountNumber} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, accountNumber: e.target.value } })} /></div>
                                <div><label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>Account Name</label><input type="text" value={editFormData.accountDetails.accountName} onChange={(e) => setEditFormData({ ...editFormData, accountDetails: { ...editFormData.accountDetails, accountName: e.target.value } })} /></div>
                            </div>"""
content = content.replace(old_update_form, new_update_form)

# And finally replacing the table mapping
old_table_row = """                                        <tr key={salon._id}>
                                            <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 'bold' }}>{salon.name}</td>
                                            <td>{salon.location}</td>
                                            <td style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>{salon.salonCode}</td>
                                            <td>
                                                <button
                                                    onClick={() => startEditing(salon)}
                                                    className="btn-primary outline"
                                                    style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>"""

new_table_row = """                                        <React.Fragment key={salon._id}>
                                        <tr>
                                            <td>{new Date(salon.createdAt).toLocaleDateString()}</td>
                                            <td style={{ fontWeight: 'bold' }}>{salon.name}</td>
                                            <td>{salon.location}</td>
                                            <td style={{ color: 'var(--secondary-color)', fontWeight: 'bold' }}>{salon.salonCode}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button onClick={() => setExpandedSalonId(expandedSalonId === salon._id ? null : salon._id)} className="btn-primary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                                        {expandedSalonId === salon._id ? 'Hide' : 'View'} Details
                                                    </button>
                                                    <button onClick={() => startEditing(salon)} className="btn-primary outline" style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}>
                                                        Edit
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedSalonId === salon._id && (
                                            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                                                <td colSpan="5" style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                                                        <div>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 1:</strong> {salon.contactNumber1 || salon.contactNumber || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Contact 2:</strong> {salon.contactNumber2 || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Remark:</strong> {salon.remark || 'N/A'}</p>
                                                        </div>
                                                        <div>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Bank:</strong> {salon.accountDetails?.bankName || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Branch:</strong> {salon.accountDetails?.branch || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Account No:</strong> {salon.accountDetails?.accountNumber || 'N/A'}</p>
                                                            <p style={{ margin: '0.2rem 0' }}><strong>Account Name:</strong> {salon.accountDetails?.accountName || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        </React.Fragment>"""
content = content.replace(old_table_row, new_table_row)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done updating SalesmanDashboard.jsx")
