const adminEmail = 'admin123@gmail.com';
const sessionKey = 'monitor-current-user';

const loadCurrentUser = () => {
    try {
        return JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    } catch {
        return null;
    }
};

const currentUser = loadCurrentUser();

if (!currentUser?.email) {
    window.location.replace('index.html');
} else if (currentUser.email.trim().toLowerCase() !== adminEmail) {
    window.location.replace('app.html');
} else {
    const accountStorageKey = 'monitor-accounts';
    const reportStorageKey = 'monitor-issue-reports';
    const pendingList = document.querySelector('#pending-list');
    const emptyPending = document.querySelector('#empty-pending');
    const adminTabs = [...document.querySelectorAll('[role="tab"]')];

    document.querySelector('#admin-name').textContent = currentUser.username || 'Admin';

    const activateAdminTab = activeTab => {
        adminTabs.forEach(tab => {
            const isActive = tab === activeTab;
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
            document.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden = !isActive;
        });
    };

    adminTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateAdminTab(tab));
        tab.addEventListener('keydown', event => {
            let nextIndex = index;
            if (event.key === 'ArrowRight') {
                nextIndex = (index + 1) % adminTabs.length;
            } else if (event.key === 'ArrowLeft') {
                nextIndex = (index - 1 + adminTabs.length) % adminTabs.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = adminTabs.length - 1;
            } else {
                return;
            }

            event.preventDefault();
            adminTabs[nextIndex].focus();
            activateAdminTab(adminTabs[nextIndex]);
        });
    });

    const loadStoredItems = key => {
        try {
            const items = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(items) ? items : [];
        } catch {
            return [];
        }
    };

    const isPending = report => report.status === 'Pending' || report.status === 'Open';

    const renderPendingReports = () => {
        const pendingReports = loadStoredItems(reportStorageKey).filter(isPending);
        pendingList.replaceChildren();
        emptyPending.hidden = pendingReports.length > 0;
        document.querySelector('#pending-count').textContent = `${pendingReports.length} pending`;

        pendingReports.forEach(report => {
            const item = document.createElement('li');
            item.className = 'report-item';

            const details = document.createElement('div');
            details.className = 'report-details';

            const type = document.createElement('strong');
            type.textContent = report.type || 'Issue report';

            const area = document.createElement('span');
            area.className = 'report-area';
            area.textContent = report.area || 'Area not provided';

            const description = document.createElement('p');
            description.textContent = report.description || '';

            if (typeof report.photoDataUrl === 'string' && report.photoDataUrl.startsWith('data:image/')) {
                const evidence = document.createElement('figure');
                evidence.className = 'report-photo-proof';

                const image = document.createElement('img');
                image.src = report.photoDataUrl;
                image.alt = `Photo evidence for ${report.type || 'issue report'}`;

                const caption = document.createElement('figcaption');
                caption.textContent = 'Photo evidence';
                evidence.append(image, caption);
                details.append(type, area, description, evidence);
            } else {
                details.append(type, area, description);
            }

            const meta = document.createElement('div');
            meta.className = 'report-meta';

            const timestamp = document.createElement('time');
            const reportDate = report.createdAt ? new Date(report.createdAt) : null;
            if (reportDate && !Number.isNaN(reportDate.getTime())) {
                timestamp.dateTime = reportDate.toISOString();
                timestamp.textContent = reportDate.toLocaleString();
            } else {
                timestamp.textContent = 'Date not recorded';
            }

            const status = document.createElement('span');
            status.className = 'report-status';
            status.textContent = 'Pending';

            meta.append(timestamp, status);
            item.append(details, meta);
            pendingList.append(item);
        });
    };

    const renderAccounts = () => {
        const accountList = document.querySelector('#account-list');
        const accounts = loadStoredItems(accountStorageKey);
        accountList.replaceChildren();

        accounts.forEach(account => {
            const item = document.createElement('li');
            item.className = 'account-item';

            const identity = document.createElement('div');
            identity.className = 'account-identity';

            const name = document.createElement('strong');
            name.textContent = account.username || 'Unnamed account';

            const email = document.createElement('span');
            email.textContent = account.email || 'Email not recorded';

            const created = document.createElement('time');
            created.className = 'account-created';
            const createdDate = account.createdAt ? new Date(account.createdAt) : null;
            if (createdDate && !Number.isNaN(createdDate.getTime())) {
                created.dateTime = createdDate.toISOString();
                created.textContent = createdDate.toLocaleString();
            } else {
                created.textContent = 'Creation date not recorded';
            }

            identity.append(name, email);
            item.append(identity, created);
            accountList.append(item);
        });

        document.querySelector('#account-count').textContent = `${accounts.length} ${accounts.length === 1 ? 'account' : 'accounts'}`;
    };

    document.querySelector('#logout-button').addEventListener('click', () => {
        sessionStorage.removeItem(sessionKey);
        window.location.assign('index.html');
    });

    renderPendingReports();
    renderAccounts();
}