import { h } from 'preact';
import { PureComponent, useEffect, useState } from 'preact/compat';
import jdenticon from 'jdenticon';
import { useDataView } from '../core';

// to avoid using the cardinal 1, 2, 3 ... identicons
const DECARDINALIFY = id => `profile picture for ${id}`;

/**
 * Renders a member’s profile picture.
 *
 * # Props
 * - `id`: member ID
 * - `self`: set to true to load 'self' instead
 * - `profilePictureHash`: if given, will load the profile picture; will show an identicon
 *   otherwise
 */
export default function ProfilePicture ({ id, self, profilePictureHash }) {
    if (profilePictureHash) {
        return <CodeholderProfilePicture id={id} self={self} />;
    }
    return <IdenticonProfilePicture id={id} />;
}

function CodeholderProfilePicture ({ id, self }) {
    const [,, data] = useDataView('codeholders/codeholder', {
        id: self ? 'self' : id,
        lazyFetch: true,
        fields: ['profilePicture'],
    });

    if (data && data.profilePicture) {
        const sizes = data.profilePicture;
        const imgSrcSet = [32, 64, 128, 256].map(w => `${sizes[w]} ${w}w`).join(', ');
        return (
            <img
                class="profile-picture"
                srcSet={imgSrcSet} />
        );
    }
    return <IdenticonProfilePicture id={id} />;
}

function IdenticonProfilePicture ({ id }) {
    const [objectUrl, setObjectUrl] = useState(null);
    useEffect(() => {
        const url = URL.createObjectURL(new Blob([
            jdenticon.toSvg(DECARDINALIFY(id), 128),
        ], {
            type: 'image/svg+xml',
        }));
        setObjectUrl(url);

        return () => URL.revokeObjectURL(url);
    }, [id]);

    return (
        <img
            class="profile-picture is-identicon"
            src={objectUrl} />
    );
}
