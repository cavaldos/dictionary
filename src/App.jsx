import { useState, useEffect, useMemo } from 'react'
import { Volume2, Languages } from 'lucide-react'
import './App.css'

function App() {
  const [words, setWords] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [translations, setTranslations] = useState({})
  const [loadingTranslations, setLoadingTranslations] = useState({})
  const [translationsEn, setTranslationsEn] = useState({})
  const [loadingTranslationsEn, setLoadingTranslationsEn] = useState({})

  // Khởi tạo Speech Synthesis
  useEffect(() => {
    if ('speechSynthesis' in window) {
      // Load voices
      speechSynthesis.getVoices()
    }
  }, [])

  // Hàm phát âm từ
  const pronounceWord = (word) => {
    if ('speechSynthesis' in window) {
      // Dừng phát âm hiện tại nếu có
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(word)
      utterance.lang = 'fr-FR'
      utterance.rate = 0.8
      utterance.pitch = 1

      // Tìm giọng nói tiếng Pháp
      const voices = speechSynthesis.getVoices()
      const frenchVoice = voices.find(voice =>
        voice.lang.startsWith('fr') ||
        voice.name.toLowerCase().includes('french')
      )

      if (frenchVoice) {
        utterance.voice = frenchVoice
      }

      speechSynthesis.speak(utterance)
    } else {
      alert('Trình duyệt của bạn không hỗ trợ phát âm')
    }
  }

  // Hàm dịch từ sử dụng MyMemory Translation API (miễn phí)
  const translateWord = async (word, index) => {
    // Kiểm tra nếu đã có bản dịch
    if (translations[index]) {
      return
    }

    setLoadingTranslations(prev => ({ ...prev, [index]: true }))

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=fr|vi`
      )
      const data = await response.json()

      if (data.responseStatus === 200 && data.responseData) {
        setTranslations(prev => ({ ...prev, [index]: data.responseData.translatedText }))
      } else {
        setTranslations(prev => ({ ...prev, [index]: 'Không thể dịch' }))
      }
    } catch (error) {
      console.error('Lỗi khi dịch:', error)
      setTranslations(prev => ({ ...prev, [index]: 'Lỗi dịch' }))
    } finally {
      setLoadingTranslations(prev => ({ ...prev, [index]: false }))
    }
  }

  // Hàm dịch sang tiếng Anh
  const translateWordToEnglish = async (word, index) => {
    // Kiểm tra nếu đã có bản dịch
    if (translationsEn[index]) {
      return
    }

    setLoadingTranslationsEn(prev => ({ ...prev, [index]: true }))

    try {
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=fr|en`
      )
      const data = await response.json()

      if (data.responseStatus === 200 && data.responseData) {
        setTranslationsEn(prev => ({ ...prev, [index]: data.responseData.translatedText }))
      } else {
        setTranslationsEn(prev => ({ ...prev, [index]: 'Cannot translate' }))
      }
    } catch (error) {
      console.error('Lỗi khi dịch:', error)
      setTranslationsEn(prev => ({ ...prev, [index]: 'Error' }))
    } finally {
      setLoadingTranslationsEn(prev => ({ ...prev, [index]: false }))
    }
  }

  useEffect(() => {
    // Đọc file CSV
    fetch('/src/data/Lexique_filtered.csv')
      .then(response => response.text())
      .then(data => {
        const lines = data.split('\n')
        const headers = lines[0].split(',')

        const parsedData = lines.slice(1)
          .filter(line => line.trim())
          .map(line => {
            const values = line.split(',')
            return {
              ortho: values[0],
              phon: values[1],
              lemme: values[2],
              cgram: values[3],
              genre: values[4],
              nombre: values[5],
              freqlemfilms2: values[6],
              freqlemlivres: values[7]
            }
          })

        setWords(parsedData)
        setLoading(false)
      })
      .catch(error => {
        console.error('Lỗi khi đọc file:', error)
        setLoading(false)
      })
  }, [])

  // Hàm xử lý sắp xếp
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
    setCurrentPage(1) // Reset về trang 1 khi sắp xếp
  }

  // Lọc và sắp xếp từ
  const filteredAndSortedWords = useMemo(() => {
    let filtered = words

    // Lọc theo search term
    if (searchTerm) {
      filtered = words.filter(word =>
        word.ortho.toLowerCase().includes(searchTerm.toLowerCase()) ||
        word.lemme.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Sắp xếp
    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a[sortConfig.key] || ''
        let bValue = b[sortConfig.key] || ''

        // Kiểm tra nếu là số
        const aNum = parseFloat(aValue)
        const bNum = parseFloat(bValue)

        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum
        }

        // So sánh chuỗi
        aValue = aValue.toString().toLowerCase()
        bValue = bValue.toString().toLowerCase()

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
      })
    }

    return filtered
  }, [words, searchTerm, sortConfig])

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredAndSortedWords.length / itemsPerPage)
  const indexOfLastItem = currentPage * itemsPerPage
  const indexOfFirstItem = indexOfLastItem - itemsPerPage
  const currentWords = filteredAndSortedWords.slice(indexOfFirstItem, indexOfLastItem)

  // Xử lý thay đổi trang
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Reset trang khi search
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  // Tạo danh sách số trang
  const getPageNumbers = () => {
    const pageNumbers = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pageNumbers.push(i)
        pageNumbers.push('...')
        pageNumbers.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pageNumbers.push(1)
        pageNumbers.push('...')
        for (let i = totalPages - 3; i <= totalPages; i++) pageNumbers.push(i)
      } else {
        pageNumbers.push(1)
        pageNumbers.push('...')
        pageNumbers.push(currentPage - 1)
        pageNumbers.push(currentPage)
        pageNumbers.push(currentPage + 1)
        pageNumbers.push('...')
        pageNumbers.push(totalPages)
      }
    }

    return pageNumbers
  }

  return (
    <div className="app">
      <h1>Từ Điển Tiếng Pháp</h1>

      <div className="search-box">
        <input
          type="text"
          placeholder="Tìm kiếm từ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {loading ? (
        <p>Đang tải dữ liệu...</p>
      ) : (
        <>
          <p className="result-count">
            Hiển thị {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAndSortedWords.length)} của {filteredAndSortedWords.length} từ
            {searchTerm && ` (tìm thấy cho "${searchTerm}")`}
          </p>

          {/* Phân trang trên */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Trước
              </button>

              <div className="pagination-numbers">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Sau →
              </button>
            </div>
          )}

          <div className="table-container">
            <table className="dictionary-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('ortho')} className="sortable">
                    Từ {sortConfig.key === 'ortho' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('phon')} className="sortable">
                    Phiên âm {sortConfig.key === 'phon' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('lemme')} className="sortable">
                    Gốc từ {sortConfig.key === 'lemme' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('cgram')} className="sortable">
                    Loại từ {sortConfig.key === 'cgram' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('genre')} className="sortable">
                    Giới tính {sortConfig.key === 'genre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('nombre')} className="sortable">
                    Số {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('freqlemfilms2')} className="sortable">
                    Tần suất (Film) {sortConfig.key === 'freqlemfilms2' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => handleSort('freqlemlivres')} className="sortable">
                    Tần suất (Sách) {sortConfig.key === 'freqlemlivres' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>Dịch tiếng Việt</th>
                  <th>English Translation</th>
                </tr>
              </thead>
              <tbody>
                {currentWords.map((word, index) => {
                  const globalIndex = indexOfFirstItem + index
                  return (
                    <tr key={index}>
                      <td className="word-ortho">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="audio-btn-small"
                            onClick={() => pronounceWord(word.ortho)}
                            title="Phát âm"
                          >
                            <Volume2 size={16} />
                          </button>
                          {word.ortho}
                        </div>
                      </td>
                      <td className="word-phon">{word.phon}</td>
                      <td>{word.lemme}</td>
                      <td className="word-cgram">{word.cgram}</td>
                      <td>{word.genre}</td>
                      <td>{word.nombre}</td>
                      <td>{word.freqlemfilms2}</td>
                      <td>{word.freqlemlivres}</td>
                      <td className="translation-cell">
                        {!translations[globalIndex] ? (
                          <button
                            className="translate-btn"
                            onClick={() => translateWord(word.ortho, globalIndex)}
                            disabled={loadingTranslations[globalIndex]}
                            title="Dịch sang tiếng Việt"
                          >
                            {loadingTranslations[globalIndex] ? (
                              <span className="loading-spinner">⏳</span>
                            ) : (
                              <Languages size={16} />
                            )}
                          </button>
                        ) : (
                          <div className="translation-result">
                            <Languages size={14} style={{ color: '#10b981', flexShrink: 0 }} />
                            <span>{translations[globalIndex]}</span>
                          </div>
                        )}
                      </td>
                      <td className="translation-cell">
                        {!translationsEn[globalIndex] ? (
                          <button
                            className="translate-btn translate-btn-en"
                            onClick={() => translateWordToEnglish(word.ortho, globalIndex)}
                            disabled={loadingTranslationsEn[globalIndex]}
                            title="Translate to English"
                          >
                            {loadingTranslationsEn[globalIndex] ? (
                              <span className="loading-spinner">⏳</span>
                            ) : (
                              <Languages size={16} />
                            )}
                          </button>
                        ) : (
                          <div className="translation-result translation-result-en">
                            <Languages size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                            <span>{translationsEn[globalIndex]}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang dưới */}
          {totalPages > 1 && (
            <div className="pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="pagination-btn"
              >
                ← Trước
              </button>

              <div className="pagination-numbers">
                {getPageNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      className={`pagination-number ${currentPage === pageNum ? 'active' : ''}`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="pagination-btn"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default App
