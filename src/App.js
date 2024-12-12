import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { SunIcon, MoonIcon, ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import * as d3 from 'd3';

const getSeverityClass = (severity, isDark) => {
  switch (severity) {
    case 'HIGH': return isDark ? 'text-red-400' : 'text-red-600';
    case 'MEDIUM-HIGH': return isDark ? 'text-orange-400' : 'text-orange-500';
    case 'MEDIUM': return isDark ? 'text-yellow-400' : 'text-yellow-500';
    case 'LOW-MEDIUM': return isDark ? 'text-blue-400' : 'text-blue-400';
    case 'LOW': return isDark ? 'text-blue-400' : 'text-blue-500';
    case 'VERY-LOW': return isDark ? 'text-green-400' : 'text-green-500';
    default: return isDark ? 'text-gray-400' : 'text-gray-500';
  }
};

const HyperSphereVisualization = ({ data, darkMode }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data?.transactions) return;

    // Setup dimensi
    const width = 400;
    const height = 400;
    const radius = Math.min(width, height) / 2 - 40;
    const innerRadius = radius * 0.6; // Radius lingkaran dalam yang lebih kecil

    // Hapus SVG yang ada
    d3.select(svgRef.current).selectAll("*").remove();

    // Buat SVG baru
    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height);

    // Buat grup untuk center
    const g = svg.append("g")
      .attr("transform", `translate(${width/2},${height/2})`);

    // Gambar lingkaran luar (batas hypersphere)
    g.append("circle")
      .attr("r", innerRadius) // Gunakan radius yang lebih kecil
      .attr("fill", "none")
      .attr("stroke", darkMode ? "#4B5563" : "#E5E7EB")
      .attr("stroke-width", 2);

    // Konversi data anomaly ke koordinat polar
    const points = data.transactions.map(tx => {
      const score = parseFloat(tx.anomaly_percentage);
      const angle = Math.random() * 2 * Math.PI; // Random angle
      const distance = tx.is_anomaly ? 
        (innerRadius + (score / 100) * (radius - innerRadius)) : // Anomali di luar lingkaran
        ((score / 100) * innerRadius * 0.9); // Normal di dalam lingkaran
      
      return {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        score: score,
        isAnomaly: tx.is_anomaly
      };
    });

    // Gambar titik-titik
    g.selectAll("circle.point")
      .data(points)
      .enter()
      .append("circle")
      .attr("class", "point")
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)
      .attr("r", 5)
      .attr("fill", d => d.isAnomaly ? 
        (darkMode ? "#EF4444" : "#DC2626") : 
        (darkMode ? "#10B981" : "#059669"))
      .attr("opacity", 0.7)
      .on("mouseover", function(event, d) {
        d3.select(this)
          .attr("r", 8)
          .attr("opacity", 1);

        // Tambah tooltip
        g.append("text")
          .attr("class", "tooltip")
          .attr("x", d.x + 10)
          .attr("y", d.y - 10)
          .attr("fill", darkMode ? "#E5E7EB" : "#1F2937")
          .text(`Score: ${d.score.toFixed(2)}`);
      })
      .on("mouseout", function() {
        d3.select(this)
          .attr("r", 5)
          .attr("opacity", 0.7);
        g.selectAll(".tooltip").remove();
      });

  }, [data, darkMode]);

  return (
    <div className={`rounded-lg shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Hypersphere Visualization
      </h2>
      <svg ref={svgRef}></svg>
    </div>
  );
};

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' atau 'asc'

  useEffect(() => {
    fetchData();
    // Check sistem preference untuk dark mode
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }

    // Set interval untuk fetch data setiap 5 menit
    const intervalId = setInterval(fetchData, 300000);

    // Cleanup interval when component unmounts
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://8.215.199.5:5000/detect_anomaly');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Error fetching data, please refresh the page');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = () => {
    if (!data?.transactions) return;
    
    const sortedTransactions = [...data.transactions].sort((a, b) => {
      const scoreA = parseFloat(a.anomaly_percentage);
      const scoreB = parseFloat(b.anomaly_percentage);
      return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
    });

    setData({
      ...data,
      transactions: sortedTransactions
    });
    setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${darkMode ? 'border-blue-400' : 'border-blue-500'}`}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${darkMode ? 'text-red-400 bg-gray-900' : 'text-red-500 bg-gray-100'}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
      <div className="max-w-full mx-auto p-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Anomaly Detection Dashboard
            </h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'bg-gray-800 text-yellow-400' : 'bg-white text-gray-800'} hover:opacity-80`}
            >
              {darkMode ? (
                <SunIcon className="h-5 w-5" />
              ) : (
                <MoonIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Transactions: {data?.total_transactions || 0}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <HyperSphereVisualization data={data} darkMode={darkMode} />
          
          {/* Statistik tambahan bisa ditambahkan di sini */}
          <div className={`rounded-lg shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Statistics
            </h2>
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <p>Total Transactions: {data?.total_transactions || 0}</p>
              <p>Anomalies: {data?.transactions?.filter(tx => tx.is_anomaly).length || 0}</p>
            </div>
          </div>
        </div>

        <div className={`rounded-lg shadow-lg p-4 ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="w-full overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                  <th className={`p-2 text-xs text-left font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Timestamp
                  </th>
                  <th className={`p-2 text-xs text-left font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Transaction Hash
                  </th>
                  <th className={`p-2 text-xs text-left font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    From
                  </th>
                  <th className={`p-2 text-xs text-left font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    To
                  </th>
                  <th className={`p-2 text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Value (ETH)
                  </th>
                  <th className={`p-2 text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <button
                      onClick={handleSort}
                      className="flex items-center justify-center space-x-1 w-full hover:opacity-80"
                    >
                      <span>Score</span>
                      {sortOrder === 'desc' ? (
                        <ArrowDownIcon className="h-4 w-4" />
                      ) : (
                        <ArrowUpIcon className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className={`p-2 text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Status
                  </th>
                  {/* <th className={`p-2 text-xs font-medium uppercase ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    Severity
                  </th> */}
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {data?.transactions?.map((tx, txIndex) => (
                  <tr key={txIndex} className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
                    <td className={`p-2 text-sm truncate max-w-[150px] ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {tx.timestamp}
                    </td>
                    <td className="p-2 text-sm truncate max-w-[150px]" title={tx.transaction_hash}>
                      <a 
                        href={`https://etherscan.io/tx/${tx.transaction_hash}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {tx.transaction_hash.substring(0, 8)}...{tx.transaction_hash.substring(tx.transaction_hash.length - 6)}
                      </a>
                    </td>
                    <td className="p-2 text-sm truncate max-w-[150px]" title={tx.from_address}>
                      <a 
                        href={`https://etherscan.io/address/${tx.from_address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {tx.from_address.substring(0, 6)}...{tx.from_address.substring(tx.from_address.length - 4)}
                      </a>
                    </td>
                    <td className="p-2 text-sm truncate max-w-[150px]" title={tx.to_address}>
                      <a 
                        href={`https://etherscan.io/address/${tx.to_address}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`${darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800'}`}
                      >
                        {tx.to_address.substring(0, 6)}...{tx.to_address.substring(tx.to_address.length - 4)}
                      </a>
                    </td>
                    <td className={`p-2 text-sm text-center ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                      {Number(tx.value_eth).toFixed(6)}
                    </td>
                    <td className={`p-2 text-sm text-center ${getSeverityClass(tx.severity, darkMode)}`}>
                      {tx.anomaly_percentage}
                    </td>
                    <td className="p-2 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        tx.is_anomaly 
                          ? (darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-800')
                          : (darkMode ? 'bg-green-900/50 text-green-300' : 'bg-green-100 text-green-800')
                      }`}>
                        {tx.is_anomaly ? 'Anomaly' : 'Normal'}
                      </span>
                    </td>
                    {/* <td className={`p-2 text-sm text-center font-medium ${getSeverityClass(tx.severity, darkMode)}`}>
                      {tx.severity}
                    </td> */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;