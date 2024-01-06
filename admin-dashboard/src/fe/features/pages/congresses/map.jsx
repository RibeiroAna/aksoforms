import { h } from 'preact';
import { createPortal, PureComponent } from 'preact/compat';
import { Spring, globalAnimator } from 'yamdl';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './map.less';

/**
 * Renders a map.
 *
 * # Props
 * - markers: { key: string?, location: coords, icon: Node }[]
 */
export default function AMap ({
    markers,
    eventHandlers,
    ...extra
}) {
    extra.className = (extra.class || '') + ' a-map-container';
    extra.class = null;
    return (
        <MapContainer {...extra}>
            <TileLayer
                // url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
                attribution="&copy <a href=&quot;https://osm.org/copyright&quot;>OpenStreetMap</a> contributors" />
            {(markers || []).map((m, i) => <MarkerRenderer
                {...m}
                key={m.key || i} />)}
            <MapEventProxy events={eventHandlers || {}} />
        </MapContainer>
    );
}

// sigh. why
function MapEventProxy ({ events }) {
    useMapEvents(events);
}

function pinShape (midY = 16, bottomY = 52) {
    // One half of the shape:
    //
    // midX    +circleCtrl
    //  x------o
    //    ...
    //       .. o
    //         .|
    //          |
    //          x midY
    //          |
    //         .|
    //        . o +circleCtrlDown
    //   o   .
    //   | +pinCtrlDX/pinCtrlDY
    //   |.
    //   |
    //   x bottomY +pinDX
    //   |
    //   o +pinCtrlDown
    //

    const midX = 18;
    const circleSize = 16;

    const circleCtrl = 7.84 / 16 * circleSize;
    const circleCtrlDown = 13.5 / 16 * circleSize;
    const pinDX = 1; // from center x
    const pinCtrlDX = 5; // from center x
    const pinCtrlDY = 14; // from circle center y
    const pinCtrlDown = 1.5;

    const topEdge = midY - circleSize;
    const rightEdge = midX + circleSize;
    const leftEdge = midX - circleSize;

    return [
        `M${midX},${topEdge}`,
        `C${midX + circleCtrl},${topEdge} ${rightEdge},${midY - circleCtrl} ${rightEdge},${midY}`,
        `C${rightEdge},${midY + circleCtrlDown} ${midX + pinCtrlDX},${midY + pinCtrlDY} ${midX + pinDX},${bottomY}`,
        `C${midX + pinDX},${bottomY + pinCtrlDown} ${midX - pinDX},${bottomY + pinCtrlDown} ${midX - pinDX},${bottomY}`,
        `C${midX - pinCtrlDX},${midY + pinCtrlDY} ${leftEdge},${midY + circleCtrlDown} ${leftEdge},${midY}`,
        `C${leftEdge},${midY - circleCtrl} ${midX - circleCtrl},${topEdge} ${midX},${topEdge}`,
    ].join(' ');
}

class MarkerRenderer extends PureComponent {
    #portalContainer = document.createElement('div');
    #portalIcon = L.divIcon({
        className: 'a-map-pin-icon',
        html: this.#portalContainer,
    });

    #highlight = new Spring(0.5, 0.3);
    #iconSize = new Spring(0.8, 0.3);

    update (dt) {
        this.#highlight.target = this.props.highlighted ? 1 : 0;
        this.#iconSize.target = this.props.icon ? 1 : 0;
        this.#highlight.update(dt);
        this.#iconSize.update(dt);

        const wantsUpdate = this.#highlight.wantsUpdate()
            || this.#iconSize.wantsUpdate();

        if (!wantsUpdate) {
            globalAnimator.deregister(this);
        }

        this.forceUpdate();
    }

    componentDidMount () {
        globalAnimator.register(this);
    }

    componentDidUpdate (prevProps) {
        if (prevProps.highlighted !== this.props.highlighted) {
            globalAnimator.register(this);
        }
        if (!!prevProps.icon !== !!this.props.icon) {
            globalAnimator.register(this);
        }
    }

    componentWillUnmount () {
        globalAnimator.deregister(this);
    }

    render ({ location, icon, highlighted, eventHandlers, ...extra }) {
        const shapeBottomY = 80;
        const shapeCircleY = shapeBottomY - 36 - (this.#highlight.value * 12);
        const iconScale = 0.4 + this.#iconSize.value * 0.6;

        const contents = (
            <div class={'map-pin-inner' + (highlighted ? ' is-highlighted' : '')}>
                <svg class="pin-shape" width="36" height="82">
                    <path class="pin-shape-path" d={pinShape(shapeCircleY, shapeBottomY)} />
                </svg>
                <div class={'pin-icon-container' + (!icon ? ' is-empty' : '')} style={{
                    transform: `translateY(${shapeCircleY}px) scale(${iconScale})`,
                }}>
                    {icon}
                </div>
            </div>
        );

        const draggable = !!(eventHandlers && eventHandlers.dragend);

        return (
            <Marker
                position={location}
                icon={this.#portalIcon}
                draggable={!!draggable}
                eventHandlers={eventHandlers}
                {...extra}>
                {createPortal(contents, this.#portalContainer)}
            </Marker>
        );
    }
}
