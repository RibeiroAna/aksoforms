import { PureComponent } from 'preact/compat';

/**
 * A page is analogous to a view controller, but there is no controller.
 * Pages may be app pages, dialog contents, or card views.
 *
 * This class aims to provide a common interface for all of them.
 *
 * # Props
 * - isActive: if true, this page is the active page and the user can interact with it.
 *   There can only be one active page at a time (this means no equal-priority split views).
 * - query: the query part of the URL
 * - onQueryChange: will be ignored if this is not the active page.
 *   Calling this will change the query part of the URL and pushState.
 * - data: Page data. This must be a serializable object for the history API’s state.
 *   This may be used to save the scroll position among other things.
 * - onDataChange: Sets page data.
 *   Will cause a (debounced) replaceState.
 * - onNavigate: convenience function for navigating
 */
export default class Page extends PureComponent {
    render () {
        return null;
    }
}
