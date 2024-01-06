import { h } from 'preact';
import { Fragment } from 'preact/compat';
import DetailPage from '../../../../components/detail/detail-page';
import DetailView from '../../../../components/detail/detail';
import { newsletterUnsubs as locale } from '../../../../locale';
import { FIELDS } from './fields';

export default class NewsletterUnsubscription extends DetailPage {
    locale = locale;

    get newsletter () {
        return +this.props.matches.newsletter[1];
    }

    get id () {
        return +this.props.match[1];
    }

    renderActions () {
        return [];
    }

    renderContents ({ editing }, { edit }) {
        return (
            <Fragment>
                <DetailView
                    view="newsletters/unsubscription"
                    options={{ newsletter: this.newsletter }}
                    id={this.id}
                    fields={FIELDS}
                    locale={locale}
                    edit={edit}
                    onEditChange={edit => this.setState({ edit })}
                    editing={editing}
                    onEndEdit={this.onEndEdit}
                    onCommit={this.onCommit}
                    onDelete={this.onDelete} />
            </Fragment>
        );
    }
}
