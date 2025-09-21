document.addEventListener('DOMContentLoaded', function() {
    if (typeof userIsLoggedIn === 'undefined' || !userIsLoggedIn) {
        return;
    }

    const profileLink = document.getElementById('profileLink');
    const userDropdown = document.getElementById('userDropdown');

    if (!profileLink || !userDropdown) {
        return;
    }

    let openedByClick = false;
    let mouseInDropdown = false;
    let closeTimeout = null;

    const isDropdownVisible = () => userDropdown.classList.contains('user-dropdown--visible');

    const setPointerOffset = (leftPosition, triggerRect) => {
        const dropdownWidth = userDropdown.offsetWidth;

        if (!dropdownWidth) {
            return;
        }

        const triggerCenter = triggerRect.left + triggerRect.width / 2;
        let pointerOffset = triggerCenter - leftPosition - 9;

        const minOffset = 24;
        const maxOffset = dropdownWidth - 24;
        pointerOffset = Math.max(minOffset, Math.min(maxOffset, pointerOffset));

        userDropdown.style.setProperty('--dropdown-pointer-offset', pointerOffset + 'px');
    };

    const repositionDropdown = () => {
        const rect = profileLink.getBoundingClientRect();

        const dropdownWidth = userDropdown.offsetWidth || 280;
        const viewportPadding = 16;
        let left = rect.right - dropdownWidth + 8;

        if (left < viewportPadding) {
            left = viewportPadding;
        }

        const maxLeft = window.innerWidth - dropdownWidth - viewportPadding;

        if (left > maxLeft) {
            left = maxLeft;
        }

        const top = window.scrollY + rect.bottom + 18;

        userDropdown.style.left = Math.round(left) + 'px';
        userDropdown.style.right = '';
        userDropdown.style.top = Math.round(top) + 'px';

        setPointerOffset(left, rect);
    };

    const setTriggerExpanded = value => {
        profileLink.setAttribute('aria-expanded', value ? 'true' : 'false');
    };

    setTriggerExpanded(false);

    const openDropdown = () => {
        if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
        }

        mouseInDropdown = false;
        userDropdown.hidden = false;
        userDropdown.style.visibility = 'hidden';

        repositionDropdown();

        userDropdown.style.visibility = '';
        userDropdown.setAttribute('aria-hidden', 'false');
        setTriggerExpanded(true);
        requestAnimationFrame(() => {
            userDropdown.classList.add('user-dropdown--visible');
        });
    };

    const closeDropdown = () => {
        if (closeTimeout) {
            clearTimeout(closeTimeout);
        }

        userDropdown.classList.remove('user-dropdown--visible');
        userDropdown.setAttribute('aria-hidden', 'true');
        openedByClick = false;
        setTriggerExpanded(false);

        closeTimeout = setTimeout(() => {
            if (!isDropdownVisible()) {
                userDropdown.hidden = true;
                closeTimeout = null;
            }
        }, 220);
    };

    profileLink.addEventListener('mouseover', () => {
        if (!isDropdownVisible()) {
            openDropdown();
        }
        openedByClick = false;
    });

    profileLink.addEventListener('click', event => {
        event.preventDefault();

        if (isDropdownVisible() && openedByClick) {
            closeDropdown();
            return;
        }

        openedByClick = true;
        openDropdown();
    });

    userDropdown.addEventListener('mouseenter', () => {
        mouseInDropdown = true;
        if (closeTimeout) {
            clearTimeout(closeTimeout);
            closeTimeout = null;
        }
    });

    userDropdown.addEventListener('mouseleave', () => {
        mouseInDropdown = false;
        if (!openedByClick) {
            closeDropdown();
        }
    });

    profileLink.addEventListener('mouseleave', () => {
        if (openedByClick || mouseInDropdown) {
            return;
        }

        closeTimeout = setTimeout(() => {
            if (!openedByClick && !mouseInDropdown) {
                closeDropdown();
            }
        }, 220);
    });

    window.addEventListener('click', event => {
        if (userDropdown.contains(event.target) || profileLink.contains(event.target)) {
            return;
        }

        closeDropdown();
    });

    window.addEventListener('resize', () => {
        if (isDropdownVisible()) {
            repositionDropdown();
        }
    });

    window.addEventListener('scroll', () => {
        if (isDropdownVisible()) {
            repositionDropdown();
        }
    }, { passive: true });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isDropdownVisible()) {
            closeDropdown();
        }
    });
});
