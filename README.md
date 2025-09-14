# CSV Data Visualization Tool

A universal data visualization tool that transforms CSV data into beautiful charts and insights. Built with React, TypeScript, and Vite, with Google Analytics 4 integration.

## Features

- 📊 **Universal CSV Support**: Upload any CSV with date and numeric columns
- 📈 **Multiple Visualization Types**: Charts, tables, and analytics dashboards
- 🔄 **Smart Period Comparison**: Automatic detection of non-overlapping time periods
- 🎨 **Custom Color Periods**: Assign colors to specific date ranges
- 📅 **Flexible Time Views**: Daily, weekly, and monthly aggregation
- 🌐 **Google Analytics 4 Integration**: Fetch data directly from GA4
- 📱 **Responsive Design**: Works on all device sizes
- 🎛️ **Advanced Controls**: Dataset visibility, units, and filtering

## Getting Started

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Google Analytics 4 property (for GA4 integration)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd csv-data-visualization-tool
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

## Google Analytics 4 Integration

To use the GA4 integration feature, you need to configure the following environment variables in your Netlify dashboard:

### Required Environment Variables

1. **GOOGLE_CLIENT_EMAIL**: Your Google Service Account email
2. **GOOGLE_PRIVATE_KEY**: Your Google Service Account private key
3. **GA4_PROPERTY_ID**: Your GA4 property ID (numbers only)

### Setting up GA4 Credentials

1. **Create a Google Service Account**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google Analytics Reporting API
   - Create a service account and download the JSON key file

2. **Configure GA4 Access**:
   - In your GA4 property, go to Admin → Property Access Management
   - Add the service account email as a user with "Viewer" permissions

3. **Add Environment Variables in Netlify**:
   - Go to your Netlify site dashboard
   - Navigate to Site settings → Build & deploy → Environment variables
   - Add the three required variables:
     - `GOOGLE_CLIENT_EMAIL`: Copy from your service account JSON
     - `GOOGLE_PRIVATE_KEY`: Copy the entire private key (including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`)
     - `GA4_PROPERTY_ID`: Your GA4 property ID (found in GA4 Admin → Property Settings)

4. **Deploy**: Trigger a new deployment to apply the environment variables

## CSV Format Requirements

Your CSV files should have:
- A column named "Date" (case-insensitive)
- At least one numeric column for metrics
- Supported date formats: YYYY-MM-DD, MM/DD/YYYY, YYYYMMDD
- Numeric values without currency symbols in the data

## Deployment

This application is configured for Netlify deployment with serverless functions.

### Build Commands
- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

### Environment Variables for Production
Configure these in your Netlify dashboard under Site settings → Environment variables:
- `GOOGLE_CLIENT_EMAIL`
- `GOOGLE_PRIVATE_KEY` 
- `GA4_PROPERTY_ID`

## Usage

1. **Upload CSV Files**: Use the file upload interface to add your data
2. **Customize Display**: Set display names and metric types
3. **Apply Filters**: Use date range and color period filters
4. **View Visualizations**: Switch between chart, table, and analytics views
5. **GA4 Integration**: Connect to Google Analytics 4 for live data

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Charts**: Chart.js with react-chartjs-2
- **Build Tool**: Vite
- **Deployment**: Netlify with serverless functions
- **CSV Parsing**: PapaParse
- **Icons**: Lucide React
- **Analytics**: Google Analytics Data API v1

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
1. Check the CSV format requirements
2. Verify GA4 credentials are properly configured
3. Ensure environment variables are set in Netlify
4. Check the browser console for error messages

## Optimizers Agency

This tool is developed by Optimizers Agency as a universal visualization solution for data analysis and reporting.