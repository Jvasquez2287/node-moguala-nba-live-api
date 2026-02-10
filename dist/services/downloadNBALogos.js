"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = downloadNBALogos;
const sharp_1 = __importDefault(require("sharp"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const teams = {
    atl: 'Atlanta Hawks',
    bkn: 'Brooklyn Nets',
    bos: 'Boston Celtics',
    cha: 'Charlotte Hornets',
    chi: 'Chicago Bulls',
    cle: 'Cleveland Cavaliers',
    dal: 'Dallas Mavericks',
    den: 'Denver Nuggets',
    det: 'Detroit Pistons',
    gsw: 'Golden State Warriors',
    hou: 'Houston Rockets',
    ind: 'Indiana Pacers',
    lac: 'LA Clippers',
    lal: 'LA Lakers',
    mem: 'Memphis Grizzlies',
    mia: 'Miami Heat',
    mil: 'Milwaukee Bucks',
    min: 'Minnesota Timberwolves',
    nop: 'New Orleans Pelicans',
    nyk: 'New York Knicks',
    okc: 'Oklahoma City Thunder',
    orl: 'Orlando Magic',
    phi: 'Philadelphia 76ers',
    phx: 'Phoenix Suns',
    por: 'Portland Trail Blazers',
    sac: 'Sacramento Kings',
    sas: 'San Antonio Spurs',
    tor: 'Toronto Raptors',
    uta: 'Utah Jazz',
    was: 'Washington Wizards',
    nba: 'NBA Logo'
};
// Function to convert logos from the folder assets/logos/{name}.png to assets/logos/250x250/{abbreviation}.png
async function downloadTeamLogos() {
    // Ensure assets/logos directory exists
    const assetsDir = path_1.default.join(process.cwd(), 'assets', 'logos', 'png');
    if (!fs_1.default.existsSync(assetsDir)) {
        fs_1.default.mkdirSync(assetsDir, { recursive: true });
    }
    let errors = [];
    let count = 0;
    for (const [abbreviation, name] of Object.entries(teams)) {
        try {
            const inputPath = path_1.default.join(assetsDir, `${name}.png`);
            const outputDir = path_1.default.join(assetsDir, '250x250');
            const outputPath = path_1.default.join(outputDir, `${abbreviation.toUpperCase()}.png`);
            // Ensure output directory exists
            if (!fs_1.default.existsSync(outputDir)) {
                fs_1.default.mkdirSync(outputDir, { recursive: true });
            }
            // Check if input file exists
            if (!fs_1.default.existsSync(inputPath)) {
                console.warn(`Input file not found for ${name}: ${inputPath}`);
                continue;
            }
            // Resize and save the logo (fit: contain to avoid cropping)
            await (0, sharp_1.default)(inputPath)
                .resize(250, 250, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }) // transparent background
                .toFile(outputPath);
            console.log(`Converted ${name} logo to 250x250 and saved as ${abbreviation.toUpperCase()}.png`);
            count++;
        }
        catch (error) {
            console.error(`Error converting ${name}:`, error);
            errors.push(name);
        }
    }
    console.log('All logos processed successfully! amountLogos: ', count);
    if (errors.length > 0) {
        console.warn('Errors occurred while processing the following teams:', errors);
    }
}
// Run the script
async function downloadNBALogos() {
    try {
        await downloadTeamLogos();
        console.log('All logos downloaded successfully!');
    }
    catch (error) {
        console.error('Error downloading logos:', error);
    }
}
//# sourceMappingURL=downloadNBALogos.js.map