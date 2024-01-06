# The Core
The application core is a web worker that handles almost all communication with the backend API.
It is located in the `src/core/` directory.
It serves as an abstraction layer.
Since it’s a web worker, it’s also easy to log out and delete all data.
It consists of:

- a data store (cache). Data loaded from the AKSO API is stored here
- tasks. These are async functions that can be called from the frontend
- views. These are views of cached data that will be updated whenever it changes

Tasks and views are accessible from the frontend by paths like `login/hasPassword`.
The corresponding function definition is found in the `core/paths/login` file.
The first part is a namespace and the second is the task or view name.

In the frontend, these are both accessible through the core context (found in `fe/core`),
which is a React context for creating tasks and views in the web worker.

Because Javascript, core objects must be memory-managed manually.
Whenever an object is no longer needed, make sure to call drop() to notify the web worker as well.

## Tasks
Tasks are very broad in their scope and are basically any kind of function call or request.
Tasks have a very specific lifecycle:

1. A task is created with a set of immutable `options` and a set of mutable `parameters`
    - options usually contain object IDs and the like
    - parameters are the exact details of the action.
      for example, when changing the name of an object, the name would be a parameter.
2. Parameters may be updated at this stage (e.g. by a task view, see below)
3. The task is run
    - if it succeeds, it will return a result to the caller and drop itself
    - if it fails, it will return to step 2

Common tasks include CRUD actions and things that interface with API representations of data.
Tasks also often update data in the data store so that it can be observed by views.

When implementing tasks, try using the task templates provided in `templates.js` as they cover almost all use cases.

## Views
Views observe data in the core.
This is often a particular object. For example, the view `codeholders/codeholder`
with the options `{ id: 50, fields: ['name'] }` would observe the data for that particular codeholder.

A lot of views (such as `codeholders/codeholder`) will also automatically load data from the AKSO API.
This can often be configured using `noFetch` (don’t fetch data)
or sometimes `lazyFetch` (given `fields`, fetch only if fields are missing).

In code, views are instances of classes that extend EventEmitter and emit `update` events containing data.

When implementing views, try using the view templates provided in `templates.js` as they cover almost all use cases.

## The Data Store
The data store is a big in-memory database of all session data such as login state,
caches, and other things.
This is where data views get their data from.

As a hierarchical data store (it’s literally a Javascript object) data should be stored in scopes
such as `login`, `codeholders`, and so on.
Such scopes can also be subscribed to (`subscribe`/`unsubscribe`) such that every time they change, a callback is called.
If there are no subscribers in a particular scope, it will eventually be deleted by the garbage collector.

This is not an IndexedDB since the AKSO admin frontend doesn’t really seem to have much need for a persistent data store.

The structure is typically something like:

- `things`
    - (thing id)
        - thing fields (usually always accessed as an entire object)

## Conventions
In general, a namespace has tasks such as:

- `getThing`/`thing`: gets an object from the API. If successful, stores it in the data store.
- `createThing`: creates a new object. Sends a POST request and, if successful, stores it in the data store.
- `updateThing`: updates an object with new values. Sends a PATCH request and, if successful, stores it in the data store.
- `deleteThing`: deletes an object. Sends a DELETE request and, if successful, deletes it from the data store.
- `listThings`: gets a list of objects from the API.
  This will store each item in the data store and then return a list of IDs.
  The frontend can then create a view for each ID to observe that particular object.

There are, roughly speaking, two types of objects: complex objects with fields and simple objects without fields.

Simple objects are treated atomically and all CRUD actions have all or most fields of the object hardcoded.
Often, the API representation is also the same as the client representation.

Complex objects (e.g. codeholders) have field handling.
It’s possible to load only the fields needed for the current task (using a `fields` option/param)
and it will be *merged* into the data already loaded in the data store.
Fields not loaded will have the value `undefined`.
Additionally, fields may have a different representation on the client than in the API.
For example, the codeholder `name` field unifies all API name fields (`firstNameLegal`, `firstName`, etc.).
These field mappings are often defined in a `clientFields` object.

`list` tasks may also accept filters.
Filters with GUI editors always have a custom client-side representation, and these will be
transformed into API filters (often defined in a `clientFilters` object).

