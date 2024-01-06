# Frontend
The frontend uses Preact, and rarely, vanilla DOM APIs.
It is located in the `src/fe/` directory.
At the top level:

- `index.jsx`: initializes the application
    - handles task views when not logged in
- `features/login/`: login screen
- `features/pages/`: application pages (see below)
- `app.jsx`: the application when logged in
    - handles task views when logged in
- `core/`: connection to the core web worker
- `locale/`: localized strings

## Navigation
App navigation is strictly hierarchical, defined in `features/pages/index.js`.
At the top level are several fixed paths (e.g. Home, Members, etc.) denoting sections of the app.
In those views, a hamburger icon will be displayed in the app bar if applicable.

Additionally, there is a global stack of pages, which will be displayed as an actual card stack on big screens,
or as regular full-screen pages on small screens.
Items higher in the stack are deeper in the navigation hierarchy.

Each top-level path may have multiple subpaths, which may either be strings as before or regular expressions matching one path fragment.
These views will always show a back button or close button instead of a hamburger icon, if applicable.

There are several types of these subpaths:

- `bottom` (stack bottom) will display a view as if it were a top-level page (admittedly the terminology gets a bit confusing here)
- `stack` views will be added to the stack
- `state` paths will not create any views but instead modify the state of the item below them in the stack (e.g. edit mode)

### Query Strings and URL Encoding
Additionally, views may store state in a query string.
If the view is below another in the page stack,
then only the topmost view’s query string will be visible in the URL, but *all* views will have their state preserved in the `window.history` API’s state object.
Views may also store additional arbitrary data in this state object, such as scroll position.

If a URL exceeds encodable lengths (i.e. ≈2000 characters) the query string will be replaced with `?T` (“truncated”)
and indicate that the page state must be loaded from the history API.
If there is no such state, we pretend it never existed.

### Link Navigation
In-app links should always use the router context instead of HTML anchors to allow for proper handling of navigation. Router context navigation will cause the current state to be saved, the new page to be loaded, and the linked URL to be decoded, and most importantly, will not cause a page load, thus preserving cached data.

## Pages
Many AKSO pages follow a very similar design:

- an overview page (type `bottom` or sometimes `stack`), which contains a searchable list view (see below)
    + a detail page (type `stack`) within, linked to by the overview list items
        * an “editing” state thereof (type `state`)
        * other miscellaneous sub-pages of the detail view
    + other miscellaneous sub-pages of the overview

This overview page will usually be a top-level path (e.g. `/membroj`). A detail page will simply add an ID to the path (e.g. `/membroj/36`). Detail page URLs should not use mutable identifiers (such as names, UEA codes, etc.) to identify an item.

Typically, the file structure is as follows:

- `index.jsx` (overview page)
    - use the `OverviewPage` (`components/detail/overview-page`) template
- `detail.jsx` (detail page)
    - use the `DetailPage` (`components/detail/detail-page`) template
- `fields.jsx` (field renderers)
    - just a big object of fields
- `filters.jsx` (filters in the overview page)
    - just a big object of filters

### Fields
Fields are specified in a big object and identified by their name.
Common properties of a field include:

- `component`: the React component that renders or edits the field. Is typically passed following props:
    - `value`: value of the field
    - `item`: the whole object that this is a field of
    - `editing`: if true, the item is being edited
    - `onChange`: callback to update the value when editing
    - `onItemChange`: callback to update the whole object when editing
- `stringify`: like `component`, but used for CSV export. See code for function argument order
- `validate`: same props as `component`. Should return an error if validation fails. If everything is fine, it should return something falsy.
- `isEmpty`: if this function returns true, this field will be grayed out and sorted to the bottom in detail views
- `shouldHide`: if this function returns true, this field will be hidden in detail views

### Searchable List Views
AKSO contains a lot of searchable lists. Commonly:

- the SearchFilters component (also provided by OverviewPage)
    - at the top there is a search bar, where users *may* also pick a field to search
    - below is a list of filters *or* a JSON filter editor
- the OverviewList component
    - below are some statistics about how long the request took and so on
    - finally, the list items
    - and at the bottom, a pagination control
    - usually, list items will link to a detail view dedicated to that one item
- users may sometimes also pick visible fields using a field picker dialog
- there may also be an option to export to csv somewhere

The search & filters control generally always follows the same format (see e.g. codeholders/list).
The list of items will always be fetched using a task and not a data view, as all lists are volatile at least to some degree (see log view in administration for an extreme example).
Each list item is however a data view, as that data will be fetched anew anyway.

Data is rendered using data renderers (see `components/data`), *including CSV output*.

On large screens, the results will usually be presented as a table,
while on smaller screens they are presented as a list of lists of properties.

## Task Views
Tasks views are a special kind of component that are indexed in `fe/index.js` and are made to mirror tasks in the core,
essentially providing users with an interface to modify task parameters and see the results.
Task views will exist for as long as the task exists (plus some animation buffer time) and are usually dialogs.
For example, a “crop profile picture” task would be accompanied by a dialog showing the crop interface and allowing for adjustment of the position and scale of the picture before running (and dropping) the task.

## Implementation Details
### Springs and the Global Animator
Almost all JS-driven animation is performed by springs and the global animator (yamdl).
To use springs, simply call `globalAnimator.register(this)`, make sure to have an instance method `update(deltaTime)`, and call `globalAnimator.deregister(this)` when done (especially in `componentWillUnmount`).
In `update(dt)`, call `spring.update(dt)` to update the spring, and `spring.wantsUpdate()` to check if the animation can be stopped.

There's also a newer, more efficient `RtSpring`/`ElementAnimationController`, which uses the Web Animation API instead of a requestAnimationFrame loop.

### Useful Components
#### Data Fields
There should probably be more of these (refactor!). Located in `components/data`. These are renderers and editors for various kinds of data.

#### RearrangingList
This component will animate a list of same-height elements, and allow the user to drag-and-drop to reorder them.

#### OverviewList
Renders an overview list.

##### StaticOverviewList
A simplified version of OverviewList that manages its own state, intended for picker dialogs.

##### OverviewListItem
This component will render a core data view.

#### Form
A submittable form. Provides a React context for custom validation. Will refuse to submit if anything that was registered in the form context returns a validation error.

##### Field
Provides layout and optionally validation.

##### ValidatedTextField
Special-case validator for text fields.

#### Segmented, Select
Various kinds of selection fields.
