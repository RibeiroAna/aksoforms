import { h } from 'preact';
import { data as locale } from '../locale';
import './membership-chip.less';

/**
 * Renders a small chip like [MA 2015] for a membership.
 *
 * # Props
 * - abbrev: membership abbreviation
 * - name: membership name
 * - year: year to show
 * - givesMembership: bool
 * - lifetime: bool
 */
export default function MembershipChip ({
    abbrev,
    name,
    year,
    givesMembership,
    lifetime,
    ...props
}) {
    props.class = (props.class || '') + ' membership-chip';
    if (year) props.class += ' has-year';
    if (givesMembership) props.class += ' gives-membership';
    if (lifetime) props.class += ' is-lifetime';

    const attrs = [];
    if (lifetime) attrs.push(locale.membershipChip.lifetime);
    if (givesMembership) attrs.push(locale.membershipChip.givesMembership);
    const title = (name || '') + ' (' + attrs.join(', ') + ')';

    return (
        <span {...props}>
            <span class="mchip-abbrev" title={title}>
                <span class="abbrev-inner">{abbrev}</span>
            </span>
            <span class="mchip-year">
                {year}
            </span>
        </span>
    );
}
