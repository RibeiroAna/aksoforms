import { connect } from '../../../../../core/connection';

export default connect(({ congress, instance }) => [
    'congresses/registrationForm',
    { congress, instance },
])((data, core, error, loaded) => ({ core, data, error, loaded }))(function WithRegistrationForm ({
    core,
    data,
    error,
    loaded,
    children,
}) {
    return children({ core, form: data, error, loaded});
});
