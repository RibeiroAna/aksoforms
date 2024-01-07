# About 

Akso-forms is a fork from the [akso](https://akso.org) project with the aim to facilitate to create forms that can be used for congresses and events.

# Install

Copy the file .env.example to an .env file and run the following docker command:

```
docker-compose -f docker-compose.yaml up --build -d

```

# Contributing and TO-DO

If you want to contribute, either create a issue here or talk to me on telegram (@anacosri), some of the planned next steps are:

- [ ] Conteinarization
    - [X] Conteinerize the database
    - [X] RabbitMQ Container
    - [ ] Conteinerize the API
    - [ ] Conteinerize the admin-dashboard
    - [ ] Explore about Kurbenetes
- [ ] Delete code not being used to our application (for example, the code to generate the `Delegita Reto`)
    - More subdetails to come
- [ ] Adapt the database and code to be non-UEA-TEJO specific
    - More subdetails to come
- [ ] Create info and registration pages for users
- [ ] Create page to show the form
- [ ] Deploy first version :D