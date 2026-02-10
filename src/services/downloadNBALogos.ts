import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const teams: { [key: string]: string } = {
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
  nba : 'NBA Logo'
};

// Function to convert logos from the folder assets/logos/{name}.png to assets/logos/{size}/{abbreviation}.png
async function downloadTeamLogos() {
  // Ensure assets/logos directory exists
  const assetsDir = path.join(process.cwd(), 'assets', 'logos', 'png');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  let errors: string[] = [];
  let count = 0;
  const sizes = [150, 250];

  for (const [abbreviation, name] of Object.entries(teams)) {
    try {
      const inputPath = path.join(assetsDir, `${name}.png`);

      // Check if input file exists
      if (!fs.existsSync(inputPath)) {
        console.warn(`Input file not found for ${name}: ${inputPath}`);
        continue;
      }

      // Create both 150x150 and 250x250 versions
      for (const size of sizes) {
        const outputDir = path.join(assetsDir, `${size}x${size}`);
        const outputPath = path.join(outputDir, `${abbreviation.toUpperCase()}.png`);

        // Ensure output directory exists
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        // Resize and save the logo (fit: contain to avoid cropping)
        await sharp(inputPath)
          .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } }) // transparent background
          .toFile(outputPath);

        console.log(`Converted ${name} logo to ${size}x${size} and saved as ${abbreviation.toUpperCase()}.png`);
      }
      count++;

    } catch (error) {
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
export default async function downloadNBALogos() {
  try {
    await downloadTeamLogos();
    console.log('All logos downloaded successfully!');
  } catch (error) {
    console.error('Error downloading logos:', error);
    }
}
