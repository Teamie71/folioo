import { globalLayer } from '@vanilla-extract/css';

// Match globals.css so stylesheet chunk order cannot change the cascade contract.
globalLayer('theme');
globalLayer('base');
export const componentLayer = globalLayer('components');
globalLayer('utilities');
