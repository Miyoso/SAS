document.addEventListener('DOMContentLoaded', loadMyEquipment);

async function loadMyEquipment() {
    const token = localStorage.getItem('sas_token');
    if (!token) return;

    let payload;
    try {
        payload = JSON.parse(atob(token.split('.')[1]));
    } catch (e) { return; }
    
    const myUsername = payload.username;

    try {
        const res = await fetch(`/api/equipment?assigned_to=${encodeURIComponent(myUsername)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            const items = await res.json();
            renderMyEquipment(items);
        }
    } catch (e) { console.error(e); }
}

function renderMyEquipment(items) {
    const container = document.getElementById('my-equipment-list');
    if (!container) return; 
    
    if (items.length === 0) {
        container.innerHTML = '<div style="color:#666; font-style:italic;">Aucune dotation.</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        let icon = '📦'; 
        if(item.category === 'ARME') icon = '🔫';
        if(item.category === 'RADIO') icon = '📻';
        if(item.category === 'TENUE') icon = '👕';
        if(item.category === 'VÉHICULE') icon = '🚔';

        return `
            <div class="equip-card" style="background:rgba(0,20,40,0.6); border:1px solid #00a8ff; padding:10px; margin-bottom:5px; display:flex; align-items:center; color:white;">
                <div style="font-size:1.5rem; margin-right:10px;">${icon}</div>
                <div>
                    <div style="font-weight:bold;">${item.item_name}</div>
                    <div style="font-size:0.8rem; color:#00a8ff; font-family:monospace;">S/N: ${item.serial_number}</div>
                </div>
            </div>
        `;
    }).join('');
}