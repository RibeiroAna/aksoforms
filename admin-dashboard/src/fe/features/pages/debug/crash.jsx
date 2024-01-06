import Page from '../../../components/page';

export default class CrashPage extends Page {
    render () {
        throw new Error('(stock explosion sound)');
    }
}
