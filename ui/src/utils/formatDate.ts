import dayjs from 'dayjs';
import { TFunction } from 'i18next';

/**
 * REASONING FOR formatDate UTILITY
 *
 * This utility is essential for handling inconsistent timestamp formats across different API endpoints
 * and ensuring consistent date display throughout the application.
 *
 * WHY WE NEED THIS:
 * 1. API Inconsistency: Our backend APIs return Unix timestamps in different formats:
 *    - Some endpoints return timestamps in seconds (e.g., HV Class Knowledge API: 1760618740)
 *    - Other endpoints return timestamps in milliseconds (e.g., 1760618740000)
 *    - Without proper handling, this causes dates to display incorrectly (e.g., 21.01.1970 instead of 16.10.2025)
 *
 * 2. JavaScript Date Handling:
 *    - JavaScript Date constructor and dayjs expect milliseconds for Unix timestamps
 *    - When we pass seconds directly, it interprets them as milliseconds, causing massive date errors
 *    - Example: 1760618740 (seconds) interpreted as milliseconds = January 21, 1970
 *    - Correct: 1760618740 * 1000 = October 16, 2025
 *
 * 3. User Experience:
 *    - Consistent date format (DD.MM.YYYY) across all tables and forms
 *    - Proper localization support for "No data" states
 *    - Prevents confusion with incorrect historical dates appearing in current data
 *
 * 4. Maintenance:
 *    - Centralized date formatting logic prevents scattered format inconsistencies
 *    - Single point of change for date format updates
 *    - Easier debugging of date-related issues
 *
 * DETECTION STRATEGY:
 * We use year 2001 (978307200000 ms) as threshold because:
 * - Any timestamp < 978307200000 when interpreted as milliseconds represents pre-2001 dates
 * - Our application data is from 2001 onwards, so pre-2001 dates indicate seconds format
 * - This approach is backwards compatible with existing millisecond timestamps
 *
 * IMPACT WITHOUT THIS UTILITY:
 * - HV Class knowledge dates showing as 1970 instead of 2025
 * - User confusion about data validity and currency
 * - Potential business logic errors based on incorrect date comparisons
 * - Inconsistent date formats across different components
 *
 * CURRENT USAGE LOCATIONS (candidates for future refactoring when API is unified):
 *
 * 1. Rail Vehicle Knowledge (SECONDS format - primary fix target):
 *    - src/utils/transformRailVehicleResponseItemsToRailVehicleTableData.ts
 *      └── formatDate(item.dt_exam, t) - exam dates
 *      └── formatDate(item.dt_reexam, t) - re-exam dates
 *
 * 2. Exam Management (format TBD - needs investigation):
 *    - src/utils/transformExamResponseItemsToExamTableData.ts
 *      └── formatDate(item.valid_from, t) - exam validity start
 *      └── formatDate(item.valid_to, t) - exam validity end
 *
 * 3. History Tracking (format TBD - needs investigation):
 *    - src/features/history/components/HistoryTable/index.tsx
 *      └── formatDate(rowData.valid_from, t) - route validity
 *      └── formatDate(rowData.sent_to_tablet, t) - tablet sync time
 *      └── formatDate(rowData.sent_to_ekn, t) - EKN sync time
 *
 * 4. Train Drivers Management (format TBD - needs investigation):
 *    - src/features/traindrivers/components/TrainDriversListingTable/index.tsx
 *      └── formatDate(rowData.signed_at, t) - signature timestamp
 *
 * 5. New/Renew Workflow (format TBD - needs investigation):
 *    - src/features/newrenew/components/NewRenewTable/index.tsx
 *      └── formatDate(rowData.sent_to_tablet, t) - tablet sync (multiple instances)
 *      └── formatDate(rowData.valid_from, t) - validity start
 *
 * FUTURE REFACTORING PLAN (when API becomes consistent):
 * 1. Audit all APIs to determine unified timestamp format (seconds vs milliseconds)
 * 2. Update backend to return consistent format across all endpoints
 * 3. Simplify formatDate to remove threshold detection logic
 * 4. Keep the utility for consistent DD.MM.YYYY formatting and null handling
 * 5. Update all transform functions to use simplified formatDate
 *
 * MIGRATION CHECKLIST (for future API unification):
 * □ HV Class Knowledge API - currently returns seconds (1760618740)
 * □ Exam Management API - format needs verification
 * □ History Tracking API - format needs verification
 * □ Train Drivers API - format needs verification
 * □ New/Renew Workflow API - format needs verification
 * □ Update formatDate to remove threshold logic after API consistency
 * □ Update all unit tests to reflect new simplified behavior
 */

/**
 * Formats a Unix timestamp to DD.MM.YYYY format or returns "No" if date is null/undefined
 *
 * @param date - Unix timestamp in seconds or milliseconds, or null/undefined
 * @param t - i18next translation function for localized "No" text
 * @returns Formatted date string (DD.MM.YYYY) or localized "No" text
 *
 * @example
 * ```tsx
 * formatDate(1609459200, t)    // Returns "01.01.2021" (seconds)
 * formatDate(1609459200000, t) // Returns "01.01.2021" (milliseconds)
 * formatDate(null, t)          // Returns "No" (localized)
 * formatDate(undefined, t)     // Returns "No" (localized)
 * ```
 */
export const formatDate = (date: number | null | undefined, t: TFunction): string => {
  if (!date) return t('Common.No');

  // If timestamp is in seconds (less than year 2001 in milliseconds), convert to milliseconds
  // Unix timestamp for year 2001 in milliseconds is 978307200000
  const timestamp = date < 978307200000 ? date * 1000 : date;

  return dayjs(timestamp).format('DD.MM.YYYY');
};
