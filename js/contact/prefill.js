(function () {
        'use strict';

        var prefillData = window.customiizerContactPrefill || {};

        function applyPrefill(form) {
                if (!form) {
                        return;
                }

                prefillData = window.customiizerContactPrefill || prefillData;

                var nameField = form.querySelector('input[name="your-name"], input[name="your-name[]"]');
                var emailField = form.querySelector('input[name="your-email"], input[name="your-email[]"]');
                if (nameField && prefillData.name && !nameField.value) {
                        nameField.value = prefillData.name;
                }

                if (emailField && prefillData.email && !emailField.value) {
                        emailField.value = prefillData.email;
                }
        }

        function prefillAllForms() {
                document.querySelectorAll('.wpcf7 form').forEach(applyPrefill);
        }

        document.addEventListener('DOMContentLoaded', prefillAllForms);

        document.addEventListener('wpcf7init', function (event) {
                if (event.detail && event.detail.form) {
                        applyPrefill(event.detail.form);
                }
        });

        document.addEventListener('wpcf7mailsent', function (event) {
                if (event.detail && event.detail.form) {
                        applyPrefill(event.detail.form);
                }
        });
})();
