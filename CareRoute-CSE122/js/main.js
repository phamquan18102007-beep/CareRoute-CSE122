let currentLoginRole = 'user';

document.addEventListener('DOMContentLoaded', function() {
    checkUserSession();
    setupCareInformationRouter();
    setupSearchFilters();
});

function normalizeSearchText(value) {
    return value
        .toLocaleLowerCase('vi')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function setupCareInformationRouter() {
    const form = document.getElementById('search-form');
    const input = document.getElementById('site-search-input');
    const processing = document.getElementById('router-processing');
    const result = document.getElementById('router-result');
    const popover = document.getElementById('router-popover');
    const submit = document.getElementById('router-submit');
    const specialtyOutput = document.getElementById('router-specialty');
    const reasonOutput = document.getElementById('router-reason');
    const emergencyOutput = document.getElementById('router-emergency');
    const acceptedOutput = document.getElementById('router-accepted');
    let latestSuggestion = null;

    const emergencyTerms = [
        'kho tho', 'dau nguc du doi', 'bat tinh', 'dot quy', 'meo mieng',
        'yeu liet', 'chay mau nhieu', 'co giat', 'ngung tho'
    ];
    const containsTerm = (text, term) => (` ${text} `).includes(` ${term} `);
    const routes = [
        {
            specialty: 'Nhi khoa',
            keywords: ['tre em', 'em be', 'be bi', 'con toi', 'tre so sinh'],
            reason: 'Thông tin cho thấy người cần khám là trẻ em; chuyên khoa Nhi là điểm bắt đầu phù hợp.'
        },
        {
            specialty: 'Tim mạch',
            keywords: ['dau nguc', 'tuc nguc', 'tim dap nhanh', 'hoi hop', 'huyet ap'],
            reason: 'Các từ khóa về đau/tức ngục, nhịp tim hoặc huyết áp thường được điều phối đến chuyên khoa Tim mạch.'
        },
        {
            specialty: 'Thần kinh',
            keywords: ['dau dau', 'chong mat', 'te bi', 'run tay', 'mat ngu'],
            reason: 'Các từ khóa về đau đầu, chóng mặt hoặc tê bì thường được điều phối đến chuyên khoa Thần kinh.'
        },
        {
            specialty: 'Hô hấp',
            keywords: ['ho', 'sot', 'dau hong', 'so mui', 'kho khan khi tho'],
            reason: 'Các từ khóa về ho, sốt hoặc đau họng thường được điều phối đến chuyên khoa Hô hấp/Nội tổng quát.'
        },
        {
            specialty: 'Tiêu hóa',
            keywords: ['dau bung', 'buon non', 'tieu chay', 'tao bon', 'day bung'],
            reason: 'Các từ khóa về đau bụng hoặc rối loạn tiêu hóa thường được điều phối đến chuyên khoa Tiêu hóa.'
        },
        {
            specialty: 'Cơ xương khớp',
            keywords: ['dau khop', 'dau lung', 'dau co', 'sung khop', 'han che van dong'],
            reason: 'Các từ khóa về đau khớp, đau lưng hoặc hạn chế vận động thường được điều phối đến chuyên khoa Cơ xương khớp.'
        },
        {
            specialty: 'Da liễu',
            keywords: ['phat ban', 'ngua da', 'noi man', 'mun', 'bong troc'],
            reason: 'Các từ khóa về phát ban, ngứa hoặc tổn thương da thường được điều phối đến chuyên khoa Da liễu.'
        }
    ];

    form.addEventListener('submit', event => {
        event.preventDefault();
        const symptoms = input.value.trim();
        if (symptoms.length < 3) {
            showToast('Nhập ít nhất 3 ký tự để tìm kiếm hoặc mô tả triệu chứng.');
            input.focus();
            return;
        }
        input.dataset.routerMode = 'true';
        document.dispatchEvent(new Event('care-router:submitted'));
        const normalizedSymptoms = normalizeSearchText(symptoms);
        const isEmergency = emergencyTerms.some(term => containsTerm(normalizedSymptoms, term));
        const childTerms = ['tre em', 'em be', 'be bi', 'con toi', 'tre so sinh'];
        const words = normalizedSymptoms.split(/\s+/);
        const isChild = childTerms.some(term => containsTerm(normalizedSymptoms, term)) || words.some(word => word === 'tre' || word === 'be');
        const matchedRoute = isChild
            ? routes[0]
            : routes.slice(1).find(route => route.keywords.some(term => containsTerm(normalizedSymptoms, term)));
        latestSuggestion = {
            specialty: isEmergency ? 'Cần hỗ trợ y tế khẩn cấp' : (matchedRoute ? matchedRoute.specialty : 'Nội tổng quát'),
            reason: isEmergency
                ? 'Mô tả có từ khóa cảnh báo cần được nhân viên y tế đánh giá khẩn cấp. Hệ thống không cố gắng phân loại thành khám chuyên khoa thông thường.'
                : (matchedRoute ? matchedRoute.reason : 'Chưa có từ khóa chuyên khoa rõ ràng; khám Nội tổng quát là lựa chọn ban đầu để được đánh giá trực tiếp.'),
            isEmergency
        };

        result.hidden = true;
        acceptedOutput.hidden = true;
        popover.hidden = false;
        processing.hidden = false;
        submit.disabled = true;
        window.setTimeout(() => {
            specialtyOutput.textContent = `Chuyên khoa/dịch vụ gợi ý: ${latestSuggestion.specialty}`;
            reasonOutput.textContent = `Vì sao có gợi ý này: ${latestSuggestion.reason}`;
            emergencyOutput.hidden = !latestSuggestion.isEmergency;
            emergencyOutput.textContent = latestSuggestion.isEmergency
                ? 'Dấu hiệu có thể cần cấp cứu: gọi 115 hoặc đến khoa Cấp cứu gần nhất ngay. Không chờ phản hồi trực tuyến.'
                : '';
            processing.hidden = true;
            result.hidden = false;
            submit.disabled = false;
        }, 550);
    });

    input.addEventListener('input', () => {
        input.dataset.routerMode = 'false';
        result.hidden = true;
        processing.hidden = true;
        popover.hidden = true;
        acceptedOutput.hidden = true;
    });
    document.getElementById('router-edit').addEventListener('click', () => {
        popover.hidden = true;
        input.focus();
        input.select();
    });
    document.getElementById('router-accept').addEventListener('click', () => {
        if (!latestSuggestion) return;
        if (latestSuggestion.isEmergency) {
            showToast('Hãy gọi 115 hoặc đến khoa Cấp cứu gần nhất ngay.');
        } else {
            showToast(`Đã chấp nhận gợi ý ${latestSuggestion.specialty}.`);
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('facility-search').value = '';
            document.getElementById('facility-search').dispatchEvent(new Event('input', { bubbles: true }));
            document.getElementById('facility-directory').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        popover.hidden = latestSuggestion.isEmergency ? false : true;
    });
}

function setupSearchFilters() {
    const siteSearch = document.getElementById('site-search-input');
    const facilitySearch = document.getElementById('facility-search');
    const typeFilter = document.getElementById('facility-type-filter');
    const siteStatus = document.getElementById('site-search-status');
    const facilityStatus = document.getElementById('facility-filter-status');
    const facilityCards = Array.from(document.querySelectorAll('.clinic-container [data-facility-type]'));
    const facilityListItems = Array.from(document.querySelectorAll('.clinic-item-card'));
    const articles = Array.from(document.querySelectorAll('.blog-card'));

    function applyFilters() {
        const routerMode = siteSearch.dataset.routerMode === 'true';
        const globalQuery = routerMode ? '' : normalizeSearchText(siteSearch.value);
        const facilityQuery = normalizeSearchText(facilitySearch.value);
        const selectedType = typeFilter.value;
        facilityCards.forEach(card => {
            const text = normalizeSearchText(card.textContent);
            const query = [globalQuery, facilityQuery]
                .filter(Boolean)
                .flatMap(term => term.split(/\s+/));
            const matchesText = query.every(term => text.includes(term));
            const matchesType = !selectedType || card.dataset.facilityType === selectedType;
            card.hidden = !matchesText || !matchesType;
        });
        articles.forEach(article => {
            const text = normalizeSearchText(article.textContent);
            article.hidden = Boolean(globalQuery) && !globalQuery.split(/\s+/).every(term => text.includes(term));
        });

        const visibleFacilities = facilityListItems.filter(card => !card.hidden).length;
        const visibleArticles = articles.filter(article => !article.hidden).length;
        facilityStatus.textContent = `${visibleFacilities} cơ sở phù hợp`;
        siteStatus.textContent = globalQuery
            ? `Tìm thấy ${visibleFacilities} cơ sở và ${visibleArticles} bài viết phù hợp với "${siteSearch.value.trim()}".`
            : '';
    }

    siteSearch.addEventListener('input', applyFilters);
    document.addEventListener('care-router:submitted', applyFilters);
    facilitySearch.addEventListener('input', applyFilters);
    typeFilter.addEventListener('change', applyFilters);
    applyFilters();
}

function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>ℹ️</span> <div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(50px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openAuthModal(defaultTab = 'login') {
    document.getElementById('auth-modal').classList.add('active');
    switchAuthTab(defaultTab);
}

function closeAuthModal() {
    document.getElementById('auth-modal').classList.remove('active');
}

function switchAuthTab(tab) {
    const loginBtn = document.getElementById('tab-btn-login');
    const regBtn = document.getElementById('tab-btn-register');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');

    if (tab === 'login') {
        loginBtn.classList.add('active');
        regBtn.classList.remove('active');
        loginForm.style.display = 'block';
        regForm.style.display = 'none';
    } else {
        regBtn.classList.add('active');
        loginBtn.classList.remove('active');
        regForm.style.display = 'block';
        loginForm.style.display = 'none';
    }
}

function selectLoginRole(role) {
    currentLoginRole = role;
    const roleButtons = {
        user: document.getElementById('role-user-btn'),
        facility: document.getElementById('role-facility-btn'),
        reviewer: document.getElementById('role-reviewer-btn'),
        admin: document.getElementById('role-admin-btn')
    };
    const adminCodeWrap = document.getElementById('admin-code-wrap');

    Object.entries(roleButtons).forEach(([roleName, button]) => {
        const isSelected = roleName === role;
        button.classList.toggle('active', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
    });
    adminCodeWrap.classList.toggle('active', role === 'admin');
    document.getElementById('login-identifier-label').innerText =
        role === 'admin' ? 'Tên tài khoản / Email Admin' : 'Email hoặc số điện thoại';
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    input.type = input.type === 'password' ? 'text' : 'password';
}

function handleLogin(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const adminCode = document.getElementById('admin-code').value.trim();

    if (currentLoginRole === 'admin') {
        if (adminCode !== 'ADMIN2026' && adminCode !== 'admin') {
            showToast('❌ Mã xác thực Admin không hợp lệ! (Thử: ADMIN2026)');
            return;
        }
        const adminUser = { name: 'Phạm Minh Quân (Admin)', email: identifier || 'admin@careroute.vn', role: 'admin', letters: 'AD' };
        localStorage.setItem('careroute_user', JSON.stringify(adminUser));
        showToast('🔑 Đăng nhập Quản trị viên thành công!');
    } else {
        const nameParts = identifier.split('@')[0];
        const displayName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);
        const roleNames = {
            user: 'Người dân',
            facility: 'Cơ sở y tế',
            reviewer: 'Kiểm duyệt viên'
        };
        const user = {
            name: identifier.includes('@') ? displayName : 'Khách hàng ' + identifier.slice(-4),
            email: identifier,
            role: currentLoginRole,
            roleName: roleNames[currentLoginRole],
            letters: displayName.substring(0, 2).toUpperCase()
        };
        localStorage.setItem('careroute_user', JSON.stringify(user));
        showToast(`✅ Đăng nhập ${roleNames[currentLoginRole]} thành công!`);
    }
    closeAuthModal();
    checkUserSession();
}

function handleRegister(e) {
    e.preventDefault();
    const fullname = document.getElementById('reg-fullname').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-confirm-password').value;

    if (pass !== confirmPass) {
        showToast('❌ Mật khẩu xác nhận không khớp!');
        return;
    }
    const newUser = { name: fullname, email: email, role: 'user', letters: fullname.charAt(0).toUpperCase() };
    localStorage.setItem('careroute_user', JSON.stringify(newUser));
    showToast('🎉 Đăng ký tài khoản thành công!');
    closeAuthModal();
    checkUserSession();
}

function checkUserSession() {
    const savedUser = localStorage.getItem('careroute_user');
    const unloggedBox = document.getElementById('auth-buttons-unlogged');
    const loggedBox = document.getElementById('auth-user-logged');

    if (savedUser) {
        const user = JSON.parse(savedUser);
        unloggedBox.style.display = 'none';
        loggedBox.style.display = 'block';
        document.getElementById('header-username').innerText = user.name;
        document.getElementById('header-avatar-letters').innerText = user.letters || 'U';
        document.getElementById('dropdown-fullname').innerText = user.name;
        document.getElementById('dropdown-email').innerText = user.email || 'N/A';
        const badgeContainer = document.getElementById('admin-badge-container');
        const roleNames = {
            user: 'Người dùng',
            facility: 'Cơ sở y tế',
            reviewer: 'Kiểm duyệt viên',
            admin: 'Quản trị viên'
        };
        if (user.role === 'admin') {
            document.getElementById('header-role-text').innerText = roleNames.admin;
            badgeContainer.innerHTML = '<span class="admin-badge-pill">ADMINISTRATOR</span>';
        } else {
            document.getElementById('header-role-text').innerText =
                user.roleName || roleNames[user.role] || roleNames.user;
            badgeContainer.innerHTML = '';
        }
    } else {
        unloggedBox.style.display = 'flex';
        loggedBox.style.display = 'none';
    }
}

function toggleUserMenu() {
    document.getElementById('user-dropdown-menu').classList.toggle('show');
}

function logout() {
    localStorage.removeItem('careroute_user');
    document.getElementById('user-dropdown-menu').classList.remove('show');
    showToast('👋 Đã đăng xuất khỏi tài khoản!');
    checkUserSession();
}