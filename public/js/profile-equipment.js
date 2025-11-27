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
        container.innerHTML = '<div style="color:rgba(255,255,255,0.4); font-style:italic; font-size:0.8rem; padding:10px;">> AUCUNE DOTATION ENREGISTRÉE</div>';
        return;
    }

    container.innerHTML = items.map(item => {
        let icon = '📦'; 
        if(item.category === 'ARME') icon = '🔫';
        if(item.category === 'RADIO') icon = '📻';
        if(item.category === 'TENUE') icon = '👕';
        if(item.category === 'VÉHICULE') icon = '🚔';

        return `
            <div class="equip-card" style="background:rgba(0, 255, 170, 0.05); border-left:2px solid var(--secondary); padding:8px; margin-bottom:8px; display:flex; align-items:center; color:#ddd;">
                <div style="font-size:1.2rem; margin-right:12px; opacity:0.8;">${icon}</div>
                <div>
                    <div style="font-weight:bold; font-size:0.9rem; font-family:'Share Tech Mono'; letter-spacing:1px;">${item.item_name}</div>
                    <div style="font-size:0.7rem; color:var(--primary); font-family:monospace;">ID: ${item.serial_number}</div>
                </div>
            </div>
        `;
    }).join('');
}