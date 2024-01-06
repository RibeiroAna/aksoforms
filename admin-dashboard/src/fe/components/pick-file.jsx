const filePickerInput = document.createElement('input');
filePickerInput.type = 'file';
filePickerInput.id = 'global-invisible-file-picker-input';
Object.assign(filePickerInput.style, {
    position: 'fixed',
    left: '-1887px',
    top: '-1887px',
});
document.body.appendChild(filePickerInput);

let cb = null;

filePickerInput.onchange = () => {
    if (filePickerInput.files.length && cb) {
        cb(filePickerInput.files);
        filePickerInput.value = ''; // reset
    }
};

export default function pickFile (accept, callback) {
    filePickerInput.accept = accept;
    cb = callback;
    filePickerInput.click();
}
