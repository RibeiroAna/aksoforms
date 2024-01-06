import { h } from 'preact';
import { PureComponent, createContext } from 'preact/compat';

export const metaContext = createContext();

export class MetaProvider extends PureComponent {
    update (data) {
        this.props.onUpdate && this.props.onUpdate(data);
    }

    render ({ children }) {
        return (
            <metaContext.Provider value={this}>
                {children}
            </metaContext.Provider>
        );
    }
}

/**
 * Provides page metadata to the navigation controller.
 *
 * # Props
 * - title: title string
 * - actions: list of app bar actions.
 *            will only update if length changes or if item keys change.
 */
export default class Meta extends PureComponent {
    static contextType = metaContext;

    componentDidMount () {
        this.context.update(this.props);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.title !== this.props.title
            || prevProps.actions.length !== this.props.actions.length
            || !!prevProps.actions.find((x, i) => this.props.actions[i].key !== x.key)) {
            this.context.update(this.props);
        }
    }

    render () {
        return null;
    }
}
