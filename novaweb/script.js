/* ==========================================================================
   NovaWeb landing page
   Features: mobile navigation, smooth scrolling, reveal on scroll,
   contact form validation, dynamic copyright year.
   Every feature checks that its elements exist before it runs.
   ========================================================================== */

(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;

  // Lets the stylesheet apply JavaScript-only styles (dropdown menu, reveal).
  root.classList.add('js');

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const desktopQuery = window.matchMedia('(min-width: 900px)');

  const prefersReducedMotion = () => reducedMotionQuery.matches;

  // Safari before 14 only supports addListener.
  function onMediaChange(query, handler) {
    if (typeof query.addEventListener === 'function') {
      query.addEventListener('change', handler);
    } else if (typeof query.addListener === 'function') {
      query.addListener(handler);
    }
  }

  /* ---------- Mobile navigation ---------- */
  function initNavigation() {
    const header = doc.querySelector('.site-header');
    const toggle = doc.getElementById('nav-toggle');
    const nav = doc.getElementById('site-nav');
    if (!toggle || !nav) return;

    const label = toggle.querySelector('.nav-toggle__label');

    function isOpen() {
      return toggle.getAttribute('aria-expanded') === 'true';
    }

    function setOpen(open, options) {
      const returnFocus = Boolean(options && options.returnFocus);
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (label) label.textContent = open ? 'Close menu' : 'Open menu';
      if (!open && returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', () => setOpen(!isOpen()));

    // Close after choosing a link.
    nav.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) {
        setOpen(false);
      }
    });

    // Escape closes the menu and returns focus to the button.
    doc.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) {
        setOpen(false, { returnFocus: true });
      }
    });

    // Clicking outside the header closes the menu.
    doc.addEventListener('click', (event) => {
      if (!isOpen() || !(event.target instanceof Node)) return;
      const container = header || nav;
      if (!container.contains(event.target)) setOpen(false);
    });

    // Tabbing out of the header closes the menu.
    if (header) {
      header.addEventListener('focusout', (event) => {
        const next = event.relatedTarget;
        if (isOpen() && next instanceof Node && !header.contains(next)) {
          setOpen(false);
        }
      });
    }

    // Reset when the layout switches to the desktop navigation.
    onMediaChange(desktopQuery, (event) => {
      if (event.matches) setOpen(false);
    });
  }

  /* ---------- Smooth scrolling for internal links ---------- */
  function initSmoothScroll() {
    doc.addEventListener('click', (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (!(event.target instanceof Element)) return;
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;

      const hash = link.getAttribute('href');
      if (!hash || hash.length < 2) return;

      let id;
      try {
        id = decodeURIComponent(hash.slice(1));
      } catch (error) {
        return;
      }

      const target = doc.getElementById(id);
      if (!target) return;

      event.preventDefault();

      target.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'start'
      });

      // Keep the address bar in sync without adding a scroll jump.
      if (window.history && typeof window.history.pushState === 'function') {
        try {
          window.history.pushState(null, '', hash);
        } catch (error) {
          /* Some sandboxed contexts block history changes. */
        }
      }

      // Move keyboard and screen reader focus to the section.
      if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const items = Array.from(doc.querySelectorAll('.reveal'));
    if (!items.length) return;

    function showAll() {
      items.forEach((item) => item.classList.add('is-visible'));
    }

    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    items.forEach((item) => observer.observe(item));

    // If the visitor turns on reduced motion later, show everything at once.
    onMediaChange(reducedMotionQuery, (event) => {
      if (event.matches) {
        observer.disconnect();
        showAll();
      }
    });
  }

  /* ---------- Contact form validation ---------- */
  function initContactForm() {
    const form = doc.getElementById('contact-form');
    if (!form) return;

    const status = doc.getElementById('form-status');
    const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const MIN_MESSAGE = 20;
    const MAX_MESSAGE = 1000;

    const rules = [
      {
        id: 'name',
        validate(value) {
          if (!value) return 'Enter your name.';
          if (value.length < 2) return 'Your name needs at least 2 characters.';
          return '';
        }
      },
      {
        id: 'email',
        validate(value) {
          if (!value) return 'Enter your email address.';
          if (!EMAIL_PATTERN.test(value)) {
            return 'Enter a valid email address, for example name@example.com.';
          }
          return '';
        }
      },
      {
        id: 'project-type',
        validate(value) {
          return value ? '' : 'Choose the type of project you need.';
        }
      },
      {
        id: 'message',
        validate(value) {
          if (!value) return 'Tell us a little about your project.';
          if (value.length < MIN_MESSAGE) {
            return 'Add a few more details: ' + value.length + ' of ' + MIN_MESSAGE + ' characters so far.';
          }
          if (value.length > MAX_MESSAGE) {
            return 'Keep your message under ' + MAX_MESSAGE + ' characters.';
          }
          return '';
        }
      }
    ];

    // Only wire up fields that exist in the markup.
    const fields = rules
      .map((rule) => ({
        rule,
        input: doc.getElementById(rule.id),
        error: doc.getElementById(rule.id + '-error'),
        dirty: false
      }))
      .filter((field) => field.input);

    function setError(field, message) {
      field.input.setAttribute('aria-invalid', 'true');
      if (field.error) {
        field.error.textContent = message;
        field.error.hidden = false;
      }
    }

    function clearError(field) {
      field.input.removeAttribute('aria-invalid');
      if (field.error) {
        field.error.textContent = '';
        field.error.hidden = true;
      }
    }

    // Returns true when the field is valid.
    function validateField(field) {
      const message = field.rule.validate(field.input.value.trim());
      if (message) {
        setError(field, message);
        return false;
      }
      clearError(field);
      return true;
    }

    function setStatus(type, message) {
      if (!status) return;
      status.textContent = message;
      status.classList.remove('is-success', 'is-error');
      if (type) status.classList.add('is-' + type);
    }

    fields.forEach((field) => {
      const markDirty = () => {
        field.dirty = true;
        // Re-check as the person types, but only after the first check.
        if (field.input.hasAttribute('aria-invalid')) validateField(field);
      };

      field.input.addEventListener('input', markDirty);
      field.input.addEventListener('change', () => {
        field.dirty = true;
        validateField(field);
      });
      field.input.addEventListener('blur', () => {
        if (field.dirty) validateField(field);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const invalid = fields.filter((field) => !validateField(field));

      if (invalid.length) {
        const count = invalid.length;
        setStatus(
          'error',
          'Please fix ' + count + (count === 1 ? ' field' : ' fields') + ' and try again.'
        );
        invalid[0].input.focus();
        return;
      }

      // No data leaves the page. Be explicit so nobody expects a reply.
      setStatus(
        'success',
        'Your details look complete. This is a demo page without a backend, so nothing was sent. ' +
          'To receive real messages, connect the form to a server endpoint or a form service.'
      );
    });
  }

  /* ---------- Copyright year ---------- */
  function initYear() {
    const year = doc.getElementById('year');
    if (year) year.textContent = String(new Date().getFullYear());
  }

  /* ---------- Start ---------- */
  function init() {
    initNavigation();
    initSmoothScroll();
    initReveal();
    initContactForm();
    initYear();
  }

  if (doc.readyState === 'loading') {
    doc.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
