const sessionKey = 'monitor-current-user';
const adminEmail = 'admin123@gmail.com';

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
} else if (currentUser.email.trim().toLowerCase() === adminEmail) {
    window.location.replace('admin.html');
} else {
    const dashboardName = document.querySelector('#dashboard-name');
    const reportForm = document.querySelector('#report-form');
    const issueArea = document.querySelector('#issue-area');
    const locationStatus = document.querySelector('#location-status');
    const reportFeedback = document.querySelector('#report-feedback');
    const reportList = document.querySelector('#report-list');
    const emptyReports = document.querySelector('#empty-reports');
    const photoInput = document.querySelector('#issue-photo');
    const photoPreview = document.querySelector('#photo-preview');
    const photoPreviewImage = document.querySelector('#photo-preview-image');
    const photoStatus = document.querySelector('#photo-status');
    const userTabs = [...document.querySelectorAll('[role="tab"]')];
    const reportStorageKey = 'monitor-issue-reports';
    const maxPhotoSize = 5 * 1024 * 1024;
    const maxStoredPhotoSize = 512 * 1024;

    dashboardName.textContent = currentUser.username || currentUser.email.split('@')[0];

    const activateUserTab = activeTab => {
        userTabs.forEach(tab => {
            const isActive = tab === activeTab;
            tab.setAttribute('aria-selected', String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
            document.querySelector(`#${tab.getAttribute('aria-controls')}`).hidden = !isActive;
        });
    };

    userTabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateUserTab(tab));
        tab.addEventListener('keydown', event => {
            let nextIndex = index;
            if (event.key === 'ArrowRight') {
                nextIndex = (index + 1) % userTabs.length;
            } else if (event.key === 'ArrowLeft') {
                nextIndex = (index - 1 + userTabs.length) % userTabs.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = userTabs.length - 1;
            } else {
                return;
            }

            event.preventDefault();
            userTabs[nextIndex].focus();
            activateUserTab(userTabs[nextIndex]);
        });
    });

    const loadReports = () => {
        try {
            const savedReports = JSON.parse(localStorage.getItem(reportStorageKey) || '[]');
            return Array.isArray(savedReports) ? savedReports : [];
        } catch {
            return [];
        }
    };

    let reports = loadReports();
    const isPendingReport = report => report.status === 'Pending' || report.status === 'Open';

    const blobToDataUrl = blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('load', () => resolve(reader.result));
        reader.addEventListener('error', () => reject(new Error('Could not read this image.')));
        reader.readAsDataURL(blob);
    });

    const preparePhotoAsDataUrl = async file => {
        const bitmap = await createImageBitmap(file);
        try {
            for (const maxDimension of [1600, 1280, 960]) {
                const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
                const canvas = document.createElement('canvas');
                canvas.width = Math.max(1, Math.round(bitmap.width * scale));
                canvas.height = Math.max(1, Math.round(bitmap.height * scale));
                const context = canvas.getContext('2d');
                if (!context) {
                    throw new Error('Could not process this image.');
                }
                context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

                for (const quality of [.82, .72, .62, .52]) {
                    const compressedBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
                    if (compressedBlob && compressedBlob.size <= maxStoredPhotoSize) {
                        return blobToDataUrl(compressedBlob);
                    }
                }
            }
        } finally {
            bitmap.close();
        }

        throw new Error('Could not reduce this photo enough for browser storage. Choose a smaller image.');
    });

    const validatePhoto = file => {
        if (!file) {
            return '';
        }
        if (!file.type.startsWith('image/')) {
            return 'Choose an image file.';
        }
        if (file.size > maxPhotoSize) {
            return 'Choose an image smaller than 5 MB.';
        }
        return '';
    };

    const renderReports = () => {
        const pendingReports = reports.filter(isPendingReport);
        reportList.replaceChildren();
        emptyReports.hidden = pendingReports.length > 0;

        pendingReports.forEach(report => {
            const item = document.createElement('li');
            item.className = 'report-item';

            const details = document.createElement('div');
            details.className = 'report-details';

            const title = document.createElement('strong');
            title.textContent = report.type;

            const area = document.createElement('span');
            area.className = 'report-area';
            area.textContent = report.area;

            const description = document.createElement('p');
            description.textContent = report.description;

            if (typeof report.photoDataUrl === 'string' && report.photoDataUrl.startsWith('data:image/')) {
                const evidence = document.createElement('figure');
                evidence.className = 'report-photo-proof';

                const image = document.createElement('img');
                image.src = report.photoDataUrl;
                image.alt = `Photo evidence for ${report.type}`;

                const caption = document.createElement('figcaption');
                caption.textContent = 'Photo evidence';
                evidence.append(image, caption);
                details.append(title, area, description, evidence);
            } else {
                details.append(title, area, description);
            }

            const meta = document.createElement('div');
            meta.className = 'report-meta';

            const timestamp = document.createElement('time');
            timestamp.dateTime = report.createdAt;
            timestamp.textContent = new Date(report.createdAt).toLocaleString();

            const status = document.createElement('span');
            status.className = 'report-status';
            status.textContent = isPendingReport(report) ? 'Pending' : report.status;

            meta.append(timestamp, status);
            item.append(details, meta);
            reportList.append(item);
        });

        document.querySelector('#total-reports').textContent = reports.length;
        document.querySelector('#open-reports').textContent = pendingReports.length;
        document.querySelector('#latest-report').textContent = pendingReports[0]?.type || 'None yet';
        document.querySelector('#report-count').textContent = `${pendingReports.length} pending`;
    };

    document.querySelector('#logout-button').addEventListener('click', () => {
        sessionStorage.removeItem(sessionKey);
        window.location.assign('index.html');
    });

    const locateButton = document.querySelector('#locate-button');
    const submitReportButton = reportForm.querySelector('[type="submit"]');
    let selectedPhotoDataUrl = '';

    photoInput.addEventListener('change', async () => {
        selectedPhotoDataUrl = '';
        photoPreview.hidden = true;
        photoStatus.textContent = '';
        const file = photoInput.files[0];
        const validationMessage = validatePhoto(file);
        if (validationMessage) {
            photoInput.value = '';
            photoStatus.textContent = validationMessage;
            return;
        }
        if (!file) {
            return;
        }

        photoStatus.textContent = 'Preparing photo...';
        submitReportButton.disabled = true;
        try {
            selectedPhotoDataUrl = await preparePhotoAsDataUrl(file);
            photoPreviewImage.src = selectedPhotoDataUrl;
            photoPreview.hidden = false;
            photoStatus.textContent = 'Photo ready to attach. A smaller copy will be saved with the report.';
        } catch (error) {
            photoInput.value = '';
            selectedPhotoDataUrl = '';
            photoStatus.textContent = error.message;
        } finally {
            submitReportButton.disabled = false;
        }
    });

    locateButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            locationStatus.textContent = 'Device location is unavailable. Enter the area manually.';
            return;
        }

        locateButton.disabled = true;
        locationStatus.textContent = 'Finding your location and looking up its address...';
        navigator.geolocation.getCurrentPosition(async position => {
            const query = new URLSearchParams({
                format: 'jsonv2',
                lat: position.coords.latitude,
                lon: position.coords.longitude,
                zoom: '18',
                addressdetails: '1'
            });
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query}`, {
                    signal: controller.signal
                });
                if (!response.ok) {
                    throw new Error('Address lookup failed');
                }

                const place = await response.json();
                if (!place.display_name) {
                    throw new Error('No address found');
                }

                issueArea.value = place.display_name;
                locationStatus.textContent = 'Address found. Check it for accuracy.';
            } catch {
                locationStatus.textContent = 'Could not look up an address. Enter the current area manually.';
            } finally {
                clearTimeout(timeoutId);
                locateButton.disabled = false;
            }
        }, error => {
            locationStatus.textContent = error.code === error.PERMISSION_DENIED
                ? 'Location permission was denied. Enter the area manually.'
                : 'Could not get your location. Enter the area manually.';
            locateButton.disabled = false;
        }, { enableHighAccuracy: true, timeout: 10000 });
    });

    reportForm.addEventListener('submit', async event => {
        event.preventDefault();
        reportFeedback.textContent = '';
        const photoFile = photoInput.files[0];
        const validationMessage = validatePhoto(photoFile);
        if (validationMessage) {
            photoStatus.textContent = validationMessage;
            return;
        }

        if (photoFile && !selectedPhotoDataUrl) {
            photoStatus.textContent = 'Wait for the photo to finish preparing, then submit again.';
            return;
        }

        const formData = new FormData(reportForm);
        const report = {
            type: formData.get('type'),
            area: formData.get('area').trim(),
            description: formData.get('description').trim(),
            photoDataUrl: selectedPhotoDataUrl,
            createdAt: new Date().toISOString(),
            status: 'Pending'
        };

        reports.unshift(report);
        try {
            localStorage.setItem(reportStorageKey, JSON.stringify(reports));
        } catch {
            reportFeedback.textContent = 'Report added, but could not be saved in this browser.';
        }

        renderReports();
        reportForm.reset();
        selectedPhotoDataUrl = '';
        photoPreview.hidden = true;
        photoPreviewImage.removeAttribute('src');
        photoStatus.textContent = '';
        locationStatus.textContent = '';
        if (!reportFeedback.textContent) {
            reportFeedback.textContent = 'Your report has been added.';
        }
    });

    renderReports();
}