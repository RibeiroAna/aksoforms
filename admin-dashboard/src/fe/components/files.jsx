import { h } from 'preact';
import ImageIcon from '@material-ui/icons/Image';
import {
    FileIcon,
    TextIcon,
    ArchiveIcon,
    DocumentIcon,
    VideoIcon,
    AudioIcon,
    FontIcon,
    ModelIcon,
    MicrosoftOfficeIcon,
    WinRARIcon,
} from './icons';
import { mime as mimeLocale, data as dataLocale } from '../locale';

const mimeIcons = {
    'image/': function Icon () {
        return <ImageIcon style={{ verticalAlign: 'middle' }} />;
    },
    'text/': TextIcon,
    'video/': VideoIcon,
    'audio/': AudioIcon,
    'model/': ModelIcon,
    'font/': FontIcon,
    'application/pdf': DocumentIcon,
    'application/zip': ArchiveIcon,
    'application/x-rar': WinRARIcon,
    'application/msword': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.template': MicrosoftOfficeIcon,
    'application/msexcel': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.template': MicrosoftOfficeIcon,
    'application/mspowerpoint': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.presentationml.template': MicrosoftOfficeIcon,
    'application/vnd.openxmlformats-officedocument.presentationml.slideshow': MicrosoftOfficeIcon,
    'application/vnd.oasis.opendocument.presentation': DocumentIcon,
    'application/vnd.oasis.opendocument.spreadsheet': DocumentIcon,
    'application/vnd.oasis.opendocument.text': DocumentIcon,
    'application/rtf': DocumentIcon,
    'application/x-gzip': ArchiveIcon,
    'application/x-bzip2': ArchiveIcon,
};

export function FileThumbnail ({ file, id, mime }) {
    void id;

    let icon = <FileIcon />;

    mime = mime || file.type;

    for (const k in mimeIcons) {
        if (mime.includes(k)) {
            const Icon = mimeIcons[k];
            icon = <Icon />;
            break;
        }
    }

    // upload dialog preview
    if (file) return <div class="file-thumbnail">{icon}</div>;

    return <div class="file-thumbnail">{icon}</div>;
}

export function Mime ({ mime }) {
    if (mimeLocale.exceptions[mime]) {
        return (
            <span class="mime-type is-special">
                {mimeLocale.exceptions[mime]}
            </span>
        );
    }

    const parts = mime.split('/');
    const type = (parts[0] || '');
    const subtype = (parts[1] || '').toUpperCase();

    return (
        <span class="mime-type">
            <span class="mime-subtype">{subtype}</span>
            {mimeLocale.types[type] ? '-' : ''}
            <span class="mime-ty">{mimeLocale.types[type]}</span>
        </span>
    );
}

export function FileSize ({ bytes }) {
    let value = bytes;
    let suffix = '';
    for (const s of dataLocale.byteSizes) {
        suffix = Array.isArray(s) ? (value === 1 ? s[0] : s[1]) : s;
        if (value >= 1000) value = Math.floor(value / 10) / 100;
        else break;
    }
    // esperanto uses commas
    value = value.toString().replace('.', ',');

    return `${value} ${suffix}`;
}
