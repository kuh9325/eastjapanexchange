# statgarten/maps vendored boundary data

- Repository: https://github.com/statgarten/maps
- Commit: `d5f8ea3208f19a73a01f865847d20cc195ae91ba`
- Data basis: 통계청 SGIS 오픈 API, 2020 행정구역 경계
- License: MIT (`LICENSE` 참조)
- Retrieved: 2026-08-02

Included files from `svg/simple/`:

- `전국_시도_경계.svg`
- `충청남도_시군구_경계.svg`
- `충청북도_시군구_경계.svg`
- `대전광역시_시군구_경계.svg`
- `세종특별자치시_시군구_경계.svg`
- `강원도_시군구_경계.svg` (제천권의 영월군 추출용)

`scripts/generate-map-data.mjs` extracts every named path, maps each local SVG
back into the matching province bounds in the national SVG, normalizes all
coordinates into the exhibition viewBox, and dissolves each organizational
branch into an outer outline without internal municipal borders.
