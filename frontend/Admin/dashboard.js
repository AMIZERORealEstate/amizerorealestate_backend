// Dashboard JavaScript
class AdminDashboard {
    constructor() {
        this.apiUrl = '/api';
        this.currentSection = 'loginForm';
        this.skills = []; // Move skills array into the class
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
        this.setupSkillsInput(); // Add skills setup
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', this.handleLogin.bind(this));
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => this.switchSection(e.target.dataset.section));
        });
        
        // Logout
        document.getElementById('logoutBtn').addEventListener('click', this.handleLogout.bind(this));
        
        // Modal buttons
        document.getElementById('addPropertyBtn').addEventListener('click', () => this.openModal('propertyModal', 'add'));
        document.getElementById('addTeamBtn').addEventListener('click', () => this.openModal('teamModal', 'add'));
        document.getElementById('addPortfolioBtn').addEventListener('click', () => this.openModal('portfolioModal', 'add'));
        
        // Form submissions
        document.getElementById('propertyForm').addEventListener('submit', this.handlePropertySubmit.bind(this));
        document.getElementById('teamForm').addEventListener('submit', this.handleTeamSubmit.bind(this));
        document.getElementById('portfolioForm').addEventListener('submit', this.handlePortfolioSubmit.bind(this));
        
        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });
    }

    // Skills management setup
    setupSkillsInput() {
        const skillInput = document.getElementById('skillInput');
        if (skillInput) {
            skillInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.addSkill(e.target.value.trim());
                    e.target.value = '';
                }
            });
        }
    }

    addSkill(skill) {
        if (skill && !this.skills.includes(skill)) {
            this.skills.push(skill);
            this.updateSkillsDisplay();
            this.updateSkillsHidden();
        }
    }

    removeSkill(skill) {
        this.skills = this.skills.filter(s => s !== skill);
        this.updateSkillsDisplay();
        this.updateSkillsHidden();
    }

    updateSkillsDisplay() {
        const container = document.getElementById('skillsContainer');
        if (container) {
            container.innerHTML = this.skills.map(skill => `
                <span class="skill-tag">
                    ${skill}
                    <button type="button" class="skill-remove" onclick="dashboard.removeSkill('${skill}')">&times;</button>
                </span>
            `).join('');
        }
    }

    updateSkillsHidden() {
        const hiddenInput = document.getElementById('skillsHidden');
        if (hiddenInput) {
            hiddenInput.value = JSON.stringify(this.skills);
        }
    }

    // Authentication methods
    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const credentials = {
            email: formData.get('email'),
            password: formData.get('password')
        };

        this.showLoading('loginBtn', true);

        try {
            const response = await fetch(`${this.apiUrl}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(credentials)
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('adminToken', result.token);
                this.showDashboard();
            } else {
                this.showError('loginError', result.message || 'Invalid credentials');
            }
        } catch (error) {
            this.showError('loginError', 'Connection error. Please try again.');
        }

        this.showLoading('loginBtn', false);
    }

    handleLogout() {
        localStorage.removeItem('adminToken');
        this.showLogin();
    }

    async checkAuthStatus() {
        const token = localStorage.getItem('adminToken');
        if (!token) {
            this.showLogin();
            return;
        }

        try {
            const response = await fetch(`${this.apiUrl}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showDashboard();
            } else {
                localStorage.removeItem('adminToken');
                this.showLogin();
            }
        } catch (error) {
            this.showLogin();
        }
    }

    showLogin() {
        document.getElementById('loginPage').style.display = 'flex';
        document.getElementById('dashboardPage').style.display = 'none';
    }

    showDashboard() {
        document.getElementById('loginPage').style.display = 'none';
        document.getElementById('dashboardPage').style.display = 'block';
        this.loadDashboardData();
    }

    // Dashboard data loading
    async loadDashboardData() {
        await Promise.all([
            this.loadStats(),
            this.loadProperties(),
            this.loadTeamMembers(),
            this.loadPortfolio(),
            this.loadRecentActivity()
        ]);
    }

    async loadStats() {
        try {
            const response = await this.authenticatedFetch('/stats');
            const stats = await response.json();
            
            document.getElementById('propertiesCount').textContent = stats.properties || 0;
            document.getElementById('teamCount').textContent = stats.team || 0;
            document.getElementById('portfolioCount').textContent = stats.portfolio || 0;
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    async loadProperties() {
        try {
            const response = await this.authenticatedFetch('/properties');
            const properties = await response.json();
            this.renderPropertiesTable(properties);
        } catch (error) {
            console.error('Error loading properties:', error);
            document.getElementById('propertiesTableBody').innerHTML = 
                '<tr><td colspan="6" style="text-align: center; color: #e74c3c;">Error loading properties</td></tr>';
        }
    }

    async loadTeamMembers() {
        try {
            const response = await this.authenticatedFetch('/team');
            const team = await response.json();
            this.renderTeamTable(team);
        } catch (error) {
            console.error('Error loading team members:', error);
            document.getElementById('teamTableBody').innerHTML = 
                '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Error loading team members</td></tr>';
        }
    }

    async loadPortfolio() {
        try {
            const response = await this.authenticatedFetch('/portfolio');
            const portfolio = await response.json();
            this.renderPortfolioTable(portfolio);
        } catch (error) {
            console.error('Error loading portfolio:', error);
            document.getElementById('portfolioTableBody').innerHTML = 
                '<tr><td colspan="5" style="text-align: center; color: #e74c3c;">Error loading portfolio</td></tr>';
        }
    }

    async loadRecentActivity() {
        try {
            const response = await this.authenticatedFetch('/activity');
            const activities = await response.json();
            this.renderRecentActivity(activities);
        } catch (error) {
            document.getElementById('recentActivity').innerHTML = '<p style="color: #e74c3c;">Error loading recent activity</p>';
        }
    }



    // Render methods
    renderPropertiesTable(properties) {
        const tbody = document.getElementById('propertiesTableBody');
        if (properties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No properties found</td></tr>';
            return;
        }

        tbody.innerHTML = properties.map(property => `
            <tr>
                <td>
                    ${property.images && property.images.length > 0 
                        ? `<img src="${property.images[0]}" alt="Property Image" style="width:100px; height:60px; object-fit:cover; border-radius:5px;">`
                        : 'No Image'}
                </td>
                <td>${property.title}</td>
                <td>${property.location}</td>
                <td>RWF ${new Intl.NumberFormat().format(property.price)}</td>
                <td>${property.type}</td>
                <td>${property.propertyType}</td>
                <td>${property.bedrooms}</td>
                <td>${property.bathrooms}</td>
                <td>${property.area}</td>
                <td>${property.description || ''}</td>
                <td><span class="badge badge-${property.status.toLowerCase()}">${property.status}</span></td>
                <td>${new Date(property.createdAt).toLocaleDateString()}</td>
                <td>${new Date(property.updatedAt).toLocaleDateString()}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="dashboard.editProperty('${property._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="dashboard.deleteProperty('${property._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderTeamTable(team) {
        const tbody = document.getElementById('teamTableBody');
        if (!team || team.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#666;">No team members found</td></tr>';
            return;
        }
        
        tbody.innerHTML = team.map(member => `
            <tr>
                <td>
                    ${
                        member.image
                            ? `<img src="${member.image}" alt="${member.name}" style="width:60px;height:60px;object-fit:cover;border-radius:50%;">`
                            : '<div style="width:60px;height:60px;background:#e9ecef;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#666;"><i class="fas fa-user"></i></div>'
                    }
                </td>
                <td><strong>${member.name}</strong></td>
                <td>${member.position}</td>
                <td><a href="mailto:${member.email}" class="social-link">${member.email}</a></td>
                <td>${member.phone || 'N/A'}</td>
                <td>
                    <div class="skills-display">
                        ${member.skills && member.skills.length > 0 
                            ? member.skills.map(skill => `<span class="skill-badge">${skill}</span>`).join('')
                            : '<span style="color:#666;">No skills listed</span>'
                        }
                    </div>
                </td>
                <td>
                    <div class="social-links">
                        ${member.socialLinks?.linkedin 
                            ? `<a href="${member.socialLinks.linkedin}" target="_blank" class="social-link" title="LinkedIn"><i class="fab fa-linkedin"></i></a>`
                            : ''
                        }
                        ${member.socialLinks?.twitter 
                            ? `<a href="${member.socialLinks.twitter}" target="_blank" class="social-link" title="Twitter"><i class="fab fa-twitter"></i></a>`
                            : ''
                        }
                        ${member.socialLinks?.email 
                            ? `<a href="mailto:${member.socialLinks.email}" class="social-link" title="Email"><i class="fas fa-envelope"></i></a>`
                            : ''
                        }
                        ${(!member.socialLinks?.linkedin && !member.socialLinks?.twitter && !member.socialLinks?.email) 
                            ? '<span style="color:#666;">N/A</span>'
                            : ''
                        }
                    </div>
                </td>
                <td style="max-width:200px; white-space:normal; word-wrap:break-word; overflow:hidden; text-overflow:ellipsis;">
                    ${member.bio ? 
                        (member.bio.length > 100 ? 
                            `<span title="${member.bio}">${member.bio.substring(0, 100)}...</span>` : 
                            member.bio
                        ) : 
                        '<span style="color:#666;">No bio available</span>'
                    }
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="dashboard.editTeamMember('${member._id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete-btn" onclick="dashboard.deleteTeamMember('${member._id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderPortfolioTable(portfolio) {
        const tbody = document.getElementById('portfolioTableBody');
        if (!portfolio || portfolio.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;color:#666;">No portfolio items found</td></tr>';
            return;
        }

        tbody.innerHTML = portfolio.map(item => `
            <tr>
                <td>${item.title}</td>
                <td><span class="badge badge-${item.category}">${item.category}</span></td>
                <td>${item.value || 'N/A'}</td>
                <td>${new Date(item.date).toLocaleDateString()}</td>
                <td>${item.client || 'N/A'}</td>
                <td>${item.location || 'N/A'}</td>
                <td>${item.duration || 'N/A'}</td>
                <td>${item.status}</td>
                <td>${item.description || 'N/A'}</td>
                <td>
                    ${
                        item.images && item.images.length > 0
                            ? `<img src="${item.images[0]}" alt="portfolio image" style="width:100px;height:60px;object-fit:cover;border-radius:6px;">`
                            : 'No Image'
                    }
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="dashboard.editPortfolioItem('${item._id}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="action-btn delete-btn" onclick="dashboard.deletePortfolioItem('${item._id}')">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        if (activities.length === 0) {
            container.innerHTML = '<p style="color: #666;">No recent activity</p>';
            return;
        }

        container.innerHTML = activities.slice(0, 10).map(activity => `
            <div style="padding: 10px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>${activity.action}</strong>
                    <p style="margin: 5px 0; color: #666; font-size: 14px;">${activity.description}</p>
                </div>
                <small style="color: #999;">${new Date(activity.timestamp).toLocaleString()}</small>
            </div>
        `).join('');
    }

    // Navigation
    switchSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        document.querySelector(`[data-section="${section}"]`).classList.add('active');
        
        // Update content
        document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
        document.getElementById(section).classList.add('active');
        
        this.currentSection = section;
    }

    // Modal management
    openModal(modalId, mode, data = null) {
        const modal = document.getElementById(modalId);
        const form = modal.querySelector('form');
        
        if (mode === 'add') {
            form.reset();
            this.skills = []; // Reset skills array
            this.updateSkillsDisplay(); // Clear skills display
            modal.querySelector('.modal-title').textContent = `Add ${modalId.replace('Modal', '')}`;
            if (form.querySelector('input[type="hidden"]')) {
                form.querySelector('input[type="hidden"]').value = '';
            }
        } else if (mode === 'edit' && data) {
            this.populateForm(form, data);
            // Load existing skills if editing team member
            if (data.skills && modalId === 'teamModal') {
                this.skills = data.skills;
                this.updateSkillsDisplay();
            }
            modal.querySelector('.modal-title').textContent = `Edit ${modalId.replace('Modal', '')}`;
        }
        
        modal.style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    populateForm(form, data) {
        Object.keys(data).forEach(key => {
            const input = form.querySelector(`[name="${key}"], #${form.id.replace('Form', '')}${key.charAt(0).toUpperCase() + key.slice(1)}`);
            if (input) {
                input.value = data[key];
            }
        });
        
        if (data._id) {
            const hiddenInput = form.querySelector('input[type="hidden"]');
            if (hiddenInput) {
                hiddenInput.value = data._id;
            }
        }
    }

    // CRUD Operations
    async handlePropertySubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const isEdit = formData.get('propertyId');

        try {
            const url = isEdit ? `/properties/${formData.get('propertyId')}` : '/properties';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.authenticatedFetch(url, {
                method,
                body: formData
            });

            if (response.ok) {
                this.showMessage('propertiesMessage', `Property ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
                this.closeModal('propertyModal');
                this.loadProperties();
                this.loadStats();
            } else {
                const error = await response.json();
                this.showMessage('propertiesMessage', error.message, 'error');
            }
        } catch (error) {
            this.showMessage('propertiesMessage', 'Error saving property', 'error');
        }
    }

    async handleTeamSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const isEdit = formData.get('teamId');

        try {
            const url = isEdit ? `/team/${formData.get('teamId')}` : '/team';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.authenticatedFetch(url, {
                method,
                body: formData
            });

            if (response.ok) {
                this.showMessage(
                    'teamMessage',
                    `Team member ${isEdit ? 'updated' : 'added'} successfully!`,
                    'success'
                );
                this.closeModal('teamModal');
                this.loadTeamMembers();
                this.loadStats();
            } else {
                const error = await response.json();
                this.showMessage('teamMessage', error.message, 'error');
            }
        } catch (error) {
            this.showMessage('teamMessage', 'Error saving team member', 'error');
        }
    }

    async handlePortfolioSubmit(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const isEdit = formData.get('portfolioId');

        try {
            const url = isEdit ? `/portfolio/${formData.get('portfolioId')}` : '/portfolio';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.authenticatedFetch(url, {
                method,
                body: formData
            });

            if (response.ok) {
                this.showMessage('portfolioMessage', `Portfolio ${isEdit ? 'updated' : 'added'} successfully!`, 'success');
                this.closeModal('portfolioModal');
                this.loadPortfolio();
                this.loadStats();
            } else {
                const error = await response.json();
                this.showMessage('portfolioMessage', error.message, 'error');
            }
        } catch (error) {
            this.showMessage('portfolioMessage', 'Error saving portfolio item', 'error');
        }
    }

    // Edit methods
    async editProperty(id) {
        try {
            const response = await this.authenticatedFetch(`/properties/${id}`);
            const property = await response.json();
            this.openModal('propertyModal', 'edit', property);
        } catch (error) {
            this.showMessage('propertiesMessage', 'Error loading property details', 'error');
        }
    }

    async editTeamMember(id) {
        try {
            const response = await this.authenticatedFetch(`/team/${id}`);
            const member = await response.json();
            this.openModal('teamModal', 'edit', member);
        } catch (error) {
            this.showMessage('teamMessage', 'Error loading team member details', 'error');
        }
    }

    async editPortfolioItem(id) {
        try {
            const response = await this.authenticatedFetch(`/portfolio/${id}`);
            const item = await response.json();
            this.openModal('portfolioModal', 'edit', item);
        } catch (error) {
            this.showMessage('portfolioMessage', 'Error loading portfolio item details', 'error');
        }
    }

    // Delete methods
    async deleteProperty(id) {
        if (!confirm('Are you sure you want to delete this property?')) return;

        try {
            const response = await this.authenticatedFetch(`/properties/${id}`, { method: 'DELETE' });
            if (response.ok) {
                this.showMessage('propertiesMessage', 'Property deleted successfully!', 'success');
                this.loadProperties();
                this.loadStats();
            } else {
                this.showMessage('propertiesMessage', 'Error deleting property', 'error');
            }
        } catch (error) {
            this.showMessage('propertiesMessage', 'Error deleting property', 'error');
        }
    }

    async deleteTeamMember(id) {
        if (!confirm('Are you sure you want to delete this team member?')) return;

        try {
            const response = await this.authenticatedFetch(`/team/${id}`, { method: 'DELETE' });
            if (response.ok) {
                this.showMessage('teamMessage', 'Team member deleted successfully!', 'success');
                this.loadTeamMembers();
                this.loadStats();
            } else {
                this.showMessage('teamMessage', 'Error deleting team member', 'error');
            }
        } catch (error) {
            this.showMessage('teamMessage', 'Error deleting team member', 'error');
        }
    }

    async deletePortfolioItem(id) {
        if (!confirm('Are you sure you want to delete this portfolio item?')) return;

        try {
            const response = await this.authenticatedFetch(`/portfolio/${id}`, { method: 'DELETE' });
            if (response.ok) {
                this.showMessage('portfolioMessage', 'Portfolio item deleted successfully!', 'success');
                this.loadPortfolio();
                this.loadStats();
            } else {
                this.showMessage('portfolioMessage', 'Error deleting portfolio item', 'error');
            }
        } catch (error) {
            this.showMessage('portfolioMessage', 'Error deleting portfolio item', 'error');
        }
    }

    // Utility methods
    async authenticatedFetch(url, options = {}) {
        const token = localStorage.getItem('adminToken');
        const config = {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${token}`
            }
        };
        
        return fetch(`${this.apiUrl}${url}`, config);
    }

    showLoading(buttonId, show) {
        const button = document.getElementById(buttonId);
        const text = button.querySelector('#loginText');
        const spinner = button.querySelector('#loginSpinner');
        
        if (show) {
            button.disabled = true;
            text.style.display = 'none';
            spinner.style.display = 'inline-block';
        } else {
            button.disabled = false;
            text.style.display = 'inline';
            spinner.style.display = 'none';
        }
    }

    showError(elementId, message) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
        }, 5000);
    }

    showMessage(elementId, message, type) {
        const element = document.getElementById(elementId);
        element.textContent = message;
        element.className = `message ${type} show`;
        setTimeout(() => {
            element.classList.remove('show');
        }, 5000);
    }
}

// Global functions for onclick handlers
function closeModal(modalId) {
    dashboard.closeModal(modalId);
}

// Initialize dashboard
const dashboard = new AdminDashboard();

// Add some CSS for badges
const additionalStyles = `
<style>
    .badge {
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
    }
    
    .badge-sale { background: #e3f2fd; color: #1976d2; }
    .badge-rent { background: #f3e5f5; color: #7b1fa2; }
    .badge-success { background: #e8f5e8; color: #2e7d32; }
    .badge-new { background: #fff3e0; color: #f57c00; }
    .badge-pending { background: #fff3e0; color: #f57c00; }
    .badge-completed { background: #e8f5e8; color: #2e7d32; }
    .badge-valuation { background: #e3f2fd; color: #1976d2; }
    .badge-management { background: #e8f5e8; color: #2e7d32; }
    .badge-brokerage { background: #f3e5f5; color: #7b1fa2; }
    .badge-survey { background: #fff3e0; color: #f57c00; }

    .skill-tag {
        display: inline-block;
        background: #007bff;
        color: white;
        padding: 4px 8px;
        margin: 2px;
        border-radius: 12px;
        font-size: 12px;
    }

    .skill-remove {
        background: none;
        border: none;
        color: white;
        margin-left: 4px;
        cursor: pointer;
        font-weight: bold;
    }

    .skill-badge {
        display: inline-block;
        background: #e9ecef;
        color: #333;
        padding: 2px 6px;
        margin: 1px;
        border-radius: 8px;
        font-size: 11px;
    }
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);