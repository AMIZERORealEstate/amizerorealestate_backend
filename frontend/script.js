// AMIZERO Real Estate Website JavaScript

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
            fetch('/api/contact', {
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

    // Close modals when clicking outside
    const successModalOverlay = document.getElementById('successModalOverlay');
    if (successModalOverlay) {
        successModalOverlay.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal('successModalOverlay');
            }
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



// Newsletter form handling
        document.querySelector('.newsletter-form').addEventListener('submit', function(e) {
            e.preventDefault();
            const email = this.querySelector('input[type="email"]').value;
            alert('Thank you for subscribing! We will send you updates to ' + email);
            this.reset();
        });
        
        // Back to top functionality
        document.querySelector('.back-to-top').addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Add parallax effect to hero section
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.style.transform = `translateY(${scrolled * 0.3}px)`;
            }
        });



        // Show the loader
    