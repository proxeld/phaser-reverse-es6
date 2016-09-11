import * as operations from './modules/code.es6';

// some dummy code
const root = document.getElementById('root');
const ulElem = document.createElement('ul');

for (const str of operations.pretty) {
    const liElem = document.createElement('li');
    liElem.innerHTML = str;
    ulElem.appendChild(liElem);
}

root.appendChild(ulElem);

// Library API
// To set
export default null;
export const hello = () => 'Hello World!';
