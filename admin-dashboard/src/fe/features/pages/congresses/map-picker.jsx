import { h } from 'preact';
import { PureComponent } from 'preact/compat';
import { Button, Dialog } from 'yamdl';
import { formatAddress } from '@cpsdqs/google-i18n-address';
import Map from './map';
import MapList from './map-list';
import LatLonEditor from './ll-editor';
import { WithCountries } from '../../../components/data/country';
import { osmAddressSearchEndpoint, data as locale } from '../../../locale';
import './map-picker.less';

/**
 * Picks a location on a map.
 *
 * - value/onChange: lat/lon tuple (number[2])
 * - nullable: if true, will allow clearing
 * - icon: optional marker icon
 * - address/onAddressChange: this will not be displayed on the map, but is used for address search
 */
export default class MapPicker extends PureComponent {
    constructor (props) {
        super(props);

        if (props.value) {
            this.initialCenter = props.value;
            this.initialZoom = 13;
        } else {
            this.initialCenter = [0, 0];
            this.initialZoom = 1;
        }
    }

    #map = null;

    get map () {
        return this.#map;
    }

    #onMapClick = e => {
        if (!this.props.onChange) return;
        this.props.onChange([e.latlng.lat, e.latlng.lng]);
    };

    render ({ value, onChange, nullable, icon, address, required }) {
        const markers = [];

        if (value) {
            markers.push({
                icon,
                location: value,
                eventHandlers: {
                    dragend: e => {
                        const loc = e.target.getLatLng();
                        onChange([loc.lat, loc.lng]);
                    },
                },
            });
        }

        return (
            <div class="a-map-picker">
                <Button
                    raised
                    class={'map-picker-from-address' + (!address ? ' is-hidden' : '')}
                    onClick={() => {
                        this.setState({ addressSearchOpen: true });
                    }}>
                    {locale.mapPicker.fromAddress}
                </Button>
                <div class="a-map-picker-map-container">
                    <Map
                        class="a-map-picker-map"
                        center={this.initialCenter}
                        zoom={this.initialZoom}
                        markers={markers}
                        whenReady={map => this.#map = map.target}
                        eventHandlers={{ click: this.#onMapClick }} />
                    <div class={'map-picker-pick-banner' + (value ? ' is-hidden' : '')}>
                        {locale.mapPicker.pickPrompt}
                    </div>
                    <div class={'map-picker-pick-banner' + (!value ? ' is-hidden' : '')}>
                        {locale.mapPicker.movePrompt}
                    </div>
                </div>
                <LatLonEditor
                    required={required}
                    value={value}
                    editing={true}
                    onChange={onChange}
                    onDelete={nullable && (() => onChange(null))} />

                <Dialog
                    class="congress-map-picker-address-search"
                    open={this.state.addressSearchOpen}
                    fullScreen={width => width < 900}
                    onClose={() => this.setState({ addressSearchOpen: false })}
                    backdrop
                    title={locale.mapPicker.fromAddress}>
                    <WithCountries>
                        {countries => (
                            <AddressSearch
                                countries={countries}
                                value={address}
                                onClose={() => this.setState({ addressSearchOpen: false })}
                                getBounds={() => this.#map.getBounds()}
                                onChange={(loc, addr) => {
                                    this.#map.panTo(loc);
                                    onChange(loc);
                                    setTimeout(() => {
                                        // FIXME: this is delayed so the onChange above isn't
                                        // swallowed up by onItemChange
                                        this.props.onAddressChange(addr);
                                    }, 150);
                                }} />
                        )}
                    </WithCountries>
                </Dialog>
            </div>
        );
    }
}

class AddressSearch extends PureComponent {
    state = {
        loading: false,
        error: null,
        items: {},
    };

    #mapList;

    load () {
        this.setState({ loading: true });

        addressSearch(this.props.value, this.props.getBounds(), this.props.countries).then(items => {
            this.setState({ items }, () => {
                this.#mapList.frameMarkers();
            });
        }).catch(error => {
            console.error(error); // eslint-disable-line no-console
            this.setState({ error });
        }).then(() => this.setState({ loading: false }));
    }

    componentDidMount () {
        this.load();
    }

    render ({ onChange, onClose }, { loading, error, items }) {
        return (
            <div class="address-search-inner">
                <MapList
                    ref={ml => this.#mapList = ml}
                    header={(
                        <div class="address-search-query">
                            <label>{locale.mapPicker.searchingForAddr}</label>
                            <div>
                                {this.props.value.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                            </div>
                        </div>
                    )}
                    loading={loading}
                    error={error}
                    items={items}
                    item={AddressItem}
                    itemToMarker={item => ({
                        key: item.id,
                        location: item.location,
                        onClick: () => {
                            onChange(item.location, item.address);
                            onClose();
                        },
                    })}
                    onItemClick={id => {
                        const item = items[id];
                        onChange(item.location, item.address);
                        onClose();
                    }} />
            </div>
        );
    }
}

function AddressItem ({ item }) {
    return (
        <div class="address-search-item">
            {item.address.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>
    );
}

async function addressSearch (address, bounds, countries) {
    const params = {
        q: address.split('\n').join(', '),
        format: 'json',
        addressdetails: '1',
        'accept-language': 'eo',
        viewbox: [bounds.getWest(), bounds.getNorth(), bounds.getEast(), bounds.getSouth()].join(','),
    };
    const url = osmAddressSearchEndpoint
        + (Object.entries(params).map(([i, j]) => `${i}=${encodeURIComponent(j)}`).join('&'));
    const result = await (await fetch(url)).json();

    // result field -> formatAddress field
    // see https://nominatim.org/release-docs/develop/api/Output/#addressdetails for fields
    const addressFieldMapping = {
        country_code: 'countryCode',
        postcode: 'postalCode',
        municipality: 'city',
        isolated_dwelling: 'city',
        croft: 'city',
        hamlet: 'city',
        village: 'city',
        town: 'city',
        city: 'city',
        city_district: 'cityArea',
        district: 'cityArea',
        borough: 'cityArea',
        suburb: 'cityArea',
        subdivision: 'cityArea',
        state: 'countryArea',
        region: 'countryArea',
    };

    const items = {};
    let id = 1;
    for (const item of result) {
        const addr = {};
        for (const k in addressFieldMapping) {
            if (item.address[k]) addr[addressFieldMapping[k]] = item.address[k];
        }
        if (item.address.road) {
            addr.streetAddress = item.address.road;
            // FIXME: we don't know which way they go
            if (item.address.house_number) addr.streetAddress += ' ' + item.address.house_number;
        }
        const countryName = countries[addr.countryCode.toLowerCase()].name_eo;
        const formattedAddress = await formatAddress(addr, undefined, undefined, countryName);

        items[id] = {
            id,
            location: [+item.lat, +item.lon],
            address: formattedAddress,
        };
        id++;
    }
    return items;
}
