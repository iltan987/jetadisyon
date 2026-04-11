import type { LocaleResources } from '@repo/i18n';

const en: LocaleResources = {
  api: {
    SUCCESS: 'Operation successful',
    CREATED: 'Record created',
    VALIDATION_ERROR: 'Validation error',
    NOT_FOUND: 'Record not found',
    UNAUTHORIZED: 'Authentication required',
    FORBIDDEN: 'You do not have permission for this action',
    CONFLICT: 'Record conflict',
    INTERNAL_ERROR: 'Server error',
    FEATURE_NOT_IMPLEMENTED: 'This feature is not yet available',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    error: 'Error',
    loading: 'Loading',
  },
  error: {
    required_field: 'This field is required',
    invalid_format: 'Invalid format',
  },
};

export default en;
