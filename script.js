// AMIZERO Real Estate Website JavaScript
// Backend API Base URL
const API_BASE_URL = 'https://amizerorealestate.onrender.com';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Modal functions
    function showModal(modalId, duration = 5000) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('show');
            
            setTimeout(() => {
                hideModal(modalId);
            }, duration);
        }
    }

    function hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }
    }

    // Form submission handler - MAIN CONTACT FORM FUNCTIONALITY
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate form before submission
            if (!validateForm()) {
                return;
            }
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            
            // Send to backend
            fetch(`${API_BASE_URL}/api/contact`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    // Update success modal message
                    const successMsg = document.getElementById('successModalMessage');
                    if (successMsg) {
                        successMsg.textContent = 'Message sent successfully! We will get back to you soon.';
                    }
                    showModal('successModalOverlay');
                    this.reset();
                } else {
                    // Update error modal with server error message
                    const errorMsg = document.getElementById('errorModalMessage');
                    if (errorMsg) {
                        errorMsg.textContent = result.error || 'Failed to send message.';
                    }
                    showModal('errorModalOverlay');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                // Update error modal with network error message
                const errorMsg = document.getElementById('errorModalMessage');
                if (errorMsg) {
                    errorMsg.textContent = 'Error sending message. Please try again later.';
                }
                showModal('errorModalOverlay');
            });
        });
    }

  

    const errorModalOverlay = document.getElementById('errorModalOverlay');
    if (errorModalOverlay) {
        errorModalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal('errorModalOverlay');
            }
        });
    }

    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            hideModal('successModalOverlay');
            hideModal('errorModalOverlay');
        }
    });

    // Form validation function
    function validateForm() {
        const form = document.getElementById('contactForm');
        if (!form) return true;
        
        const inputs = form.querySelectorAll('input[required], textarea[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.style.borderColor = '#e74c3c';
                isValid = false;
            } else {
                input.style.borderColor = '#e9ecef';
            }
        });

        return isValid;
    }

    // Add real-time form validation
    const formInputs = document.querySelectorAll('#contactForm input, #contactForm textarea');
    formInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if (this.hasAttribute('required') && !this.value.trim()) {
                this.style.borderColor = '#e74c3c';
            } else {
                this.style.borderColor = '#27ae60';
            }
        });
    });

    // Add loading animation for service cards
    const serviceCards = document.querySelectorAll('.service-card');
    serviceCards.forEach((card, index) => {
        setTimeout(() => {
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });

    // Stats counter animation
    function animateStats() {
        const stats = document.querySelectorAll('.stat-number');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const target = entry.target;
                    const finalValue = target.textContent.replace(/[^\d]/g, '');
                    const suffix = target.textContent.replace(/[\d]/g, '');
                    let currentValue = 0;
                    const increment = finalValue / 50;
                    
                    const counter = setInterval(() => {
                        currentValue += increment;
                        if (currentValue >= finalValue) {
                            currentValue = finalValue;
                            clearInterval(counter);
                        }
                        target.textContent = Math.floor(currentValue) + suffix;
                    }, 30);
                    
                    observer.unobserve(target);
                }
            });
        }, { threshold: 0.5 });
        
        stats.forEach(stat => observer.observe(stat));
    }

    // Initialize stats animation
    animateStats();

    // Add hover effects for contact items
    document.querySelectorAll('.contact-item').forEach(item => {
        item.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        item.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
    });

    // Add smooth reveal animation for sections
    const revealElements = document.querySelectorAll('.section-header, .about-text, .about-image');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.15 });

    revealElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(50px)';
        el.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        revealObserver.observe(el);
    });

});

// Functions that need to run immediately (not waiting for DOM)

// Add parallax effect to hero section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const hero = document.querySelector('.hero');
    if (hero) {
        hero.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
});



// Add floating animation to service icons
window.addEventListener('load', () => {
    document.querySelectorAll('.service-icon').forEach((icon, index) => {
        icon.style.animation = `float 3s ease-in-out infinite`;
        icon.style.animationDelay = `${index * 0.5}s`;
    });
});

// Add scroll progress indicator
function addScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 0%;
        height: 3px;
        background: linear-gradient(90deg, #667eea, #764ba2);
        z-index: 9999;
        transition: width 0.1s ease;
    `;
    document.body.appendChild(progressBar);

    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        progressBar.style.width = scrollPercent + '%';
    });
}

// Initialize scroll progress when page loads
window.addEventListener('load', addScrollProgress);

// Add click-to-call functionality
document.addEventListener('DOMContentLoaded', () => {
    const phoneLink = document.querySelector('[href*="+250"]');
    if (phoneLink) {
        phoneLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'tel:+250725502317';
        });
    }

    // Add click-to-email functionality
    const emailLink = document.querySelector('[href*="@gmail.com"]');
    if (emailLink) {
        emailLink.addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = 'mailto:amizerorealestate@gmail.com';
        });
    }
});



// Newsletter form handling - SINGLE VERSION
document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        const emailInput = this.querySelector('input[type="email"]');
        const email = emailInput.value.trim();

        if (!email) {
            showNewsletterModal('Please enter a valid email.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/api/newsletter`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            

            if (res.ok && data.success) {
                showNewsletterModal(data.message);
                emailInput.value = '';
            } else {
                showNewsletterModal(data.error || 'Subscription failed.');
            }
        } catch (err) {
            showNewsletterModal('Failed to subscribe. Please try again.');
            console.error('Newsletter error:', err);
        }
    });
});


// Newsletter Modal Setup
function createNewsletterModal() {
    if (document.getElementById('newsletterModal')) return;

    const modal = document.createElement('div');
    modal.id = 'newsletterModal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '10000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.6)';
    modal.style.backdropFilter = 'blur(5px)';
    modal.style.justifyContent = 'center';
    modal.style.alignItems = 'center';
    modal.style.flexDirection = 'column';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';

    const content = document.createElement('div');
    content.style.background = 'linear-gradient(145deg, #ffffff, #f8f9fa)';
    content.style.padding = '2.5rem';
    content.style.borderRadius = '20px';
    content.style.maxWidth = '420px';
    content.style.width = '90%';
    content.style.textAlign = 'center';
    content.style.position = 'relative';
    content.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.25)';
    content.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    content.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    content.style.transform = 'scale(0.7) translateY(50px)';
    content.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

    // Success icon
    const icon = document.createElement('div');
    icon.innerHTML = '✓';
    icon.style.width = '60px';
    icon.style.height = '60px';
    icon.style.background = 'linear-gradient(135deg, #10b981, #059669)';
    icon.style.borderRadius = '50%';
    icon.style.margin = '0 auto 1.5rem';
    icon.style.display = 'flex';
    icon.style.alignItems = 'center';
    icon.style.justifyContent = 'center';
    icon.style.fontSize = '2rem';
    icon.style.color = 'white';
    icon.style.fontWeight = 'bold';
    icon.style.boxShadow = '0 10px 25px rgba(16, 185, 129, 0.3)';

    const close = document.createElement('span');
    close.innerHTML = '&times;';
    close.style.position = 'absolute';
    close.style.top = '15px';
    close.style.right = '20px';
    close.style.fontSize = '1.8rem';
    close.style.cursor = 'pointer';
    close.style.color = '#64748b';
    close.style.width = '30px';
    close.style.height = '30px';
    close.style.display = 'flex';
    close.style.alignItems = 'center';
    close.style.justifyContent = 'center';
    close.style.borderRadius = '50%';
    close.style.background = 'rgba(248, 249, 250, 0.8)';
    close.style.transition = 'all 0.2s ease';

    close.addEventListener('mouseenter', () => {
        close.style.color = '#ef4444';
        close.style.background = 'rgba(239, 68, 68, 0.1)';
        close.style.transform = 'scale(1.1)';
    });

    close.addEventListener('mouseleave', () => {
        close.style.color = '#64748b';
        close.style.background = 'rgba(248, 249, 250, 0.8)';
        close.style.transform = 'scale(1)';
    });

    close.addEventListener('click', () => {
        modal.style.opacity = '0';
        content.style.transform = 'scale(0.7) translateY(50px)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });

    const message = document.createElement('p');
    message.id = 'newsletterModalMessage';
    message.style.fontSize = '1.2rem';
    message.style.margin = '1.5rem 0';
    message.style.color = '#334155';
    message.style.lineHeight = '1.6';
    message.style.fontWeight = '500';

    // Progress bar for auto-dismiss
    const progressBar = document.createElement('div');
    progressBar.style.position = 'absolute';
    progressBar.style.bottom = '0';
    progressBar.style.left = '0';
    progressBar.style.height = '4px';
    progressBar.style.background = 'linear-gradient(90deg, #10b981, #059669)';
    progressBar.style.borderRadius = '0 0 20px 20px';
    progressBar.style.width = '100%';
    progressBar.style.transformOrigin = 'left';
    progressBar.style.transform = 'scaleX(0)';
    progressBar.style.transition = 'transform 3s linear';

    content.appendChild(close);
    content.appendChild(icon);
    content.appendChild(message);
    content.appendChild(progressBar);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Close on outside click - SINGLE VERSION
    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.style.opacity = '0';
            content.style.transform = 'scale(0.7) translateY(50px)';
            setTimeout(() => {
                modal.style.display = 'none';
            }, 300);
        }
    });
}

function showNewsletterModal(msg) {
    createNewsletterModal();
    const modal = document.getElementById('newsletterModal');
    const content = modal.querySelector('div');
    const progressBar = modal.querySelector('div > div:last-child');
    
    document.getElementById('newsletterModalMessage').textContent = msg;
    modal.style.display = 'flex';
    
    // Trigger animations
    setTimeout(() => {
        modal.style.opacity = '1';
        content.style.transform = 'scale(1) translateY(0)';
        progressBar.style.transform = 'scaleX(1)';
    }, 10);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        modal.style.opacity = '0';
        content.style.transform = 'scale(0.7) translateY(50px)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }, 3000);
}



document.addEventListener("DOMContentLoaded", function () {
    const contactInfo = document.getElementById("contact-info");
    if (!contactInfo) return;

    let lastScroll = window.scrollY;

    window.addEventListener("scroll", function () {
        let currentScroll = window.scrollY;

        // Scrolling down → hide immediately
        if (currentScroll > lastScroll) {
            contactInfo.style.display = "none";
        } 
        // Scrolling up → show immediately
        else if (currentScroll < lastScroll) {
            contactInfo.style.display = "flex";
        }

        lastScroll = currentScroll;
    });
});