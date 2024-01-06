# Adding a new page
This guide will detail how to add a new page to AKSO admin.
“Page” here refers to one kind of API object (e.g. “magazine editions”).

## Adding bindings to the API in the core
Create a new file or edit an existing file in `src/core/paths`.
Paths are roughly organized according to the API,
so e.g. `codeholders.js` will be things that are in `/codeholders` in the API.

It’s probably easiest to use an existing file as a template.
Some files use older APIs and haven’t been refactored though, so watch out.
(At time of writing, `delegations.js` is a fairly decent template).

### Client field representation
At this point, consider whether the API data type would maybe need custom representations
of fields on the client for better usability in the GUI.

- fields that are related and most likely to be edited together should be summarized into a single field.
    - example: codeholder names are several different fields that are summarized into a single `name `field
- fields that are conditional with another field determining their value should *maybe* be summarized into a single field.
    - example: codeholder names depend on the codeholder type
- fields that have annoying representations should be converted to an easier representation on the client.
    - example: congress `dataId`s are a binary buffer, but the contents do not matter.
      We can hence convert them to a hex string on the client.
- fields that have derived data can be summarized into a single field
    - example: codeholder `cellphone` has `cellphoneFormatted` as derived data
    - derived data can be omitted when serializing `toAPI`

Client fields are defined in an object as follows:

```js
const clientFields = {
    // this field will have the same representation as in API
    simpleField: 'simpleField',
    complexField: {
        // api fields this field corresponds to
        apiFields: ['complexField'],
        // converts from API to client representation
        fromAPI: data => {
            // do some processing...
            // this value will then be available in the GUI
            return { value: data.complexField, example: true };
        },
        // converts from client to API representation, for use when creating/updating objects
        toAPI: ({ value, example }) => {
            // this is a partial API object
            return { complexField: value };
        },
    },
    complexField2: {
        apiFields: ['complexField2'],
        // other clientField (not API fields!) values that are required to deserialize this field.
        // this is basically for convenience
        requires: ['complexField'],
        fromAPI: data => {
            if (data.complexField.value) {
                return { type: 'a', value: data.complexField2 };
            } else {
                return { type: 'b', value: data.complexField2 };
            }
        },
        // return an empty object to avoid serializing this field.
        // useful for read-only fields
        toAPI: () => ({}),
    },
};

// create functions that will convert to/from the API representation
const clientFromAPI = makeClientFromAPI(clientFields);
const clientToAPI = makeClientToAPI(clientFields);
```

### Filters
If you want to provide GUI filters, you need to add a clientFilters declaration as follows:

```js
const clientFilters = {
    filterName: {
        // function to convert this filter to an API filter
        toAPI: value => {
            return { 'example': { $gt: value } };
        },
    },
    // ... more filters ...
};
```

### Storage layout
Data downloaded from API needs to be stored somewhere to be viewable.
Storage layouts are usually very simple.

For example:

```js
const THINGS = 'things';

{
    // “thing” objects can now be stored in THINGS -> id
    storePath: (id) => [THINGS, id]
}
```

This will basically create the following structure in the data store:

```js
{
    "things": {
        // IDs here
        "24": { ... },
        "55": { ... }
    }
}
```

If you have more complex structures with container objects (e.g. magazines contain editions)
then consider doing something like this:

```js
{
    "magazines": {
        "4": {
            "data": { ... magazine data ... },
            "editions": {
                "62": { ... edition data ... }
            }
        }
    }
}
```

You may also want to create signal nodes for every list.
Signal nodes are used to signal set changes, such as creation or deletion.
They are usually called `SIG_SOMETHING`, e.g. `[CONTAINER, containerId, SIG_THINGS]`.
Data views can then be used to listen for signals (see below).

### List task
Now you can write the very common `list`/`listThing` task.

First, create a simple tasks declaration, if there isn’t one:

```js
export const tasks = {
    // tasks go here
};
```

Now there is also an additional thing to consider:
should it be possible for users to pick which fields they want,
or are there situations where querying different partial views of the object is useful?

For example, codeholder objects are rather large and making use of the `fields` API parameter
is useful to only load the fields actually required.
Other things, such as roles, can just be loaded and stored as a whole object,
since they’re rather small.

Other times, it’s very clear that some fields will only appear in the detail view, so you can
just pretend these fields don’t exist in the list task and don’t need to deal with partial objects either.

#### When not using any field-related features
If you do not need any fancy features, this is fairly easy.
Simply import the `crudList` template from `templates.js`:

```js
import { crudList } from '../templates';

// ...

export const tasks = {
    // ... etc ...
    listThing: crudList({
        // the API request path.
        // will be passed task options as a parameter.
        apiPath: ({ containerId }) => `/containers/${containerId}/things`,
        // API fields to fetch
        fields: [
            'field1',
            'field2',
        ],
        // if you have filters, pass them here
        filters: clientFilters,
        // where to store each resulting item. will be passed task options and the item data
        storePath: ({ containerId }, { id }) => [CONTAINERS, containerId, THINGS, id],
    }),
    // ... etc ...
}
```

This list task will then output the common list representation used in the GUI.

#### With custom client fields or partial queries
First, you will need a parametersToRequestData function with configuration appropriate for your list.

```js
const parametersToRequestData = makeParametersToRequestData({
    // optional: when searching for a field, you can specify which other fields will be
    // displayed in the results.
    searchFieldToTransientFields: {
        clientFieldName: ['otherClientFieldName'],
    },
    // optional: remap search field names
    mapSearchField: field => {
        if (field === 'test') return 'very.specific.api.field';
        return field;
    },
    // your client fields
    clientFields,
    // your client filters
    clientFilters,
});
```

Then, in the task, use it to get API parameters:

```js
import asyncClient from '../client';
import * as store from '../store';
import { deepMerge } from '../../util';

// ...

const tasks = {
    // ...
    listThings: async ({ containerId }, parameters) => {
        // obtain the AKSO client
        const client = await asyncClient;
        // convert client parameters to API parameters
        const { options, usedFilters, transientFields } = parametersToRequestData(parameters);

        // obtain the API response
        const result = await client.get(`/path/to/api/${containerId}/things`, options);
        const list = result.body;
        const totalItems = +result.res.headers.get('x-total-items');

        const items = [];

        // store each item in the data store
        for (const item of list) {
            const id = item.id;
            // merge with existing data in the data store
            const existing = store.get([CONTAINERS, containerId, THINGS, id]);
            store.insert([CONTAINERS, containerId, THINGS, id], deepMerge(existing, clientFromAPI(item)));
            // store ID in list items
            items.push(id);
        }

        // common list representation
        return {
            items,
            total: totalItems,
            transientFields,
            stats: {
                time: result.resTime,
                filtered: usedFilters,
            },
        };
    },
    // ...
}
```

### CRUD tasks
#### Without custom fields
Again, just use the templates:

```js
import { crudCreate, crudGet, crudUpdate, crudDelete } from '../templates';

const tasks = {
    // ...
    createThing: crudCreate({
        // where to send the POST request
        apiPath: ({ containerId }) => `/containers/${containerId}/things`,
        // valid fields for creation
        fields: ['field1', 'field2'],
        // store the newly created item with the server-assigned ID
        storePath: ({ containerId }, id) => [CONTAINERS, containerId, THINGS, id],
        // signal a view that something changed
        signalPath: ({ containerId }) => [CONTAINERS, containerId, SIG_THINGS],
    }),
    getThing: crudGet({
        // where to send the GET
        apiPath: ({ containerId, id }) => `/containers/${containerId}/things/${id}`,
        // fields to load
        fields: ['field1', 'field2'],
        // where to store the loaded data
        storePath: ({ containerId, id }) => [CONTAINERS, containerId, THINGS, id],
    }),
    updateThing: crudUpdate({
        // where to send the PATCH
        apiPath: ({ containerId, id }) => `/containers/${containerId}/things/${id}`,
        // where to load/store the data
        storePath: ({ containerId, id }) => [CONTAINERS, containerId, THINGS, id],
    }),
    deleteThing: crudDelete({
        // where to send the DELETE
        apiPath: ({ containerId, id }) => `/containers/${containerId}/things/${id}`,
        // OPTION A: delete only one item
        storePath: ({ containerId, id }) => [CONTAINERS, containerId, THINGS, id],
        // OPTION B: delete several items
        // this exists because data views observing children will not be notified when
        // a parent is deleted, so you should explicitly delete any important child views too.
        storePaths: ({ containerId, id }) => [
            [CONTAINERS, containerId, THINGS, id, THING_DATA],
            [CONTAINERS, containerId, THINGS, id],
        ],
    }),
    // ...
};
```

#### With custom fields
Only the GET task will need custom logic:

```js
const tasks = {
    // ...
    getThing: async ({ containerId, id }, { fields }) => {
        const client = await asyncClient;
        // really sorry about this
        const res = await client.get(`/containers/${containerId}/things/${id}`, {
            fields: ['id'].concat(fields.flatMap(id => typeof clientFields[id] === 'string'
                ? [clientFields[id]]
                : clientFields[id].apiFields)),
        });

        const storePath = [CONTAINERS, containerId, THINGS, id];
        const existing = store.get(storePath);
        store.insert(storePath, deepMerge(existing, clientFromAPI(res.body)));

        return store.get(storePath);
    },
    // ...
};
```

The rest can use the templates as above.

### Additional tasks
Also add any additional tasks you may need for any additional API calls.
Remember to always also update the data in the data store.

#### Common task: `filtersToAPI`
Implement this task to enable “convert to JSON-filter” in the GUI.

```js
import { filtersToAPI } from '../list';

// ...

const tasks = {
    // ...
    filtersToAPI: async ({ filters }) => filtersToAPI(clientFilters, filters),
    // ...
};
```

### Adding data views
Now, all objects and signals must be exposed to the frontend via data views.
Create a `views` object if it doesn’t already exist, and add data views.

#### Without custom fields
```js
import { simpleDataView } from '../templates';

export const views = {
    // ...
    // a view to observe a single Thing
    thing: simpleDataView({
        storePath: ({
            containerId,
            id
        }) => [CONTAINERS, containerId, THINGS, id],
        // a reference to a task that can GET this item
        get: tasks.getThing,
        // if true, then data will not be fetched if data is already present in the store.
        // if false, creating a data view will fetch data, unless noFetch is set.
        canBeLazy: true,
    }),
    // a view to observe list updates
    sigThing: createStoreObserver(({ containerId }) => [CONTAINERS, containerId, SIG_THINGS]),
    // ...
};
```

#### With custom fields
Sorry… try copying the payments/intent view maybe. This really needs to be a template, though

### Adding it to the index
Now, if you created a new file, you need to add it to the index in `src/core/paths/index`.
Then the core part is done!

## Adding GUI pages to the frontend
### Localizable Strings
Add an object in `src/fe/locale` somewhere that exports localizable strings for use in this
page.
The general format is `title`, `detailTitle`, `search`, `fields`, `create`, `update`, `delete`
(see other pages for examples).

### The page index
All routable pages in the frontend are indexed in `src/fe/features/pages/index.js`.
They generally adhere to the following pattern:

- `/path/somewhere`: overview page (“index.js”)
  - `(\d+)`: id regex for a detail page (“detail.js”)
    - `editing`: editing state
    - `something-else`: subpages of the detail view. e.g. editions inside magazines
      - ...
  - other routable pages, such as the codeholder address label generator, etc.

### index.js Overview Page
Create a new directory somewhere in `src/fe/features/pages`.
Create an index.js in the directory, and add it to the page index.
You can see e.g. intermediaries for an example for how to implement these.

In it, extend the `OverviewPage` component and add following properties:

- `state`: should initialize search parameters. See other pages for examples
- `locale`: should reference a locale object. See other pages for examples
- `filters`: GUI filter definitions (see below). omit to disable filters
- `searchFields`: an array of client fields that can appear in search. omit to disable search

And two methods:

- `renderActions(...)`: return an array of menu actions. See other pages for examples
- `renderContents(...)`: return page contents; usually an `OverviewList`. See other pages for examples

### fields.js
Unless you have very few fields (e.g. roles) you should probably extract fields into a separate file.
Usually, this is just one object:

```js
export const fields = {
    exampleField: {
        // component used to render the field
        component ({ value, editing, onChange }) {
            if (editing) {
                return <TextField value={value} onChange={onChange} />;
            }
            return <span>{value}</span>;
        },
        // suggestion for where to place the field in a compact overview list.
        // (optional. defaults/falls back to body)
        slot: 'title',
        // set to true to allow sorting by this field.
        // To enable this, all API fields this field corresponds to must support filtering.
        sortable: true,
        // when used in a creation dialog:
        // set to true to add a field label before the field.
        // this can be set to false if you can add a field label directly into the field editor
        // (e.g. `label` in TextField).
        wantsCreationLabel: true,
        // how long is this field likely to be? flex weight value in the table overview list.
        weight: 2,
        // isEmpty: optional. override the default mechanism for determining if the field is
        // empty and should be sorted below any non-empty fields.
        isEmpty: (value) => value && value !== 'nothing',
        // used for CSV export: stringifier for this field.
        stringify: (value) => value,
        // automatically bound in creation dialogs and detail page fields:
        // validate the field. If possible, use HTML validation like `required` instead.
        validate ({ value }) {
            if (value === 'invalid') return locale.someKindOfError;
        },
    },
};
```

Only use as many of these properties as you need
(e.g. if you don’t have csv export, you will not need stringify).

The `component` property has following props:

- `value`: field value. nullable!
- `onChange`: when editing: change callback for the value
- `editing`: if true, we are in edit mode
- `item`: the value of the entire object, instead of just the single field.
- `onItemChange`: like onChange but for the entire item. make sure to copy existing fields!
- `slot`: describes where the component is being rendered. nullable!
    - `"table"`: in a table cell of an item in the overview list
    - `"title"`: in the title of an item in the compact overview list
    - `"titleAlt"`: in the alternate title of an item in the compact overview list
    - `"icon"`: in the icon slot of an item in the compact overview list
    - `"body"`: in the body of an item in the compact overview list
    - `"detail"`: inside the detail view
    - `"create"`: in a creation dialog
    - other slots may exist in specific domains (e.g. `"chgreq"` in change requests)
- `userData`: user data passed from the overview list or detail view. nullable!

### details.js Detail Page
This is the page that appears when you click an overview list item.
See other detail pages for examples.

Extend the `DetailPage` component and add following properties:

- `locale`: should reference a locale object. See other pages for examples

And following methods:

- `createCommitTask(changedFields, edit)`: create a core task that commits edits.
  This is typically a `things/updateThing` task.
  ChangedFields can be passed to options as `_changedFields`. Since the core task implementation
  does not use this field, we can use it as a GUI-only feature in the task view (see below).
- `renderActions(...)`: render menu actions, such as “delete item.”
- `renderContents(...)`: render the actual page contents.
  Usually a `DetailView` using several inherited methods (e.g. onCommit, onEndEdit, etc.).

## Tasks
Now you need to add task views for the tasks created previously in the core.
These task views are indexed in `src/fe/task-views.js`.
If the core path does not already have a task view definitions file, create a new one.

These are usually relatively easy to implement. Simply use the task templates in
`src/fe/components/tasks/task-templates.js` to implement most CRUD actions, and
use `TaskDialog` for any custom tasks.
Again, see other pages for examples.
