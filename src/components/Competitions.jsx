import { User } from 'lucide-react';

const competitions = [
  {
    id: 1,
    title: 'Quantum Control of a Cavity Coupled to a Qubit',
    category: 'Quantum Physics',
    author: 'Alice & Bob',
    description: 'Explore advanced quantum control techniques for cavity-qubit systems. Learn optimal control strategies and experimental implementations.',
    image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800&h=400&fit=crop',
  },
  {
    id: 2,
    title: 'H2 Ground State Energy Calculation',
    category: 'Chemistry',
    author: 'Aqora Labs',
    description: 'Calculate the ground state energy of the hydrogen molecule using quantum computational methods. Master molecular modeling fundamentals.',
    image: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&h=400&fit=crop',
  },
  {
    id: 3,
    title: 'Machine Learning for Quantum Systems',
    category: 'AI Research',
    author: 'Artix Research',
    description: 'Integrate neural networks with quantum mechanics for predictive simulations. Discover cutting-edge AI applications in quantum computing.',
    image: 'https://images.unsplash.com/photo-1555255707-c07966088b7b?w=800&h=400&fit=crop',
  },
];

export default function Competitions({ darkMode, searchQuery }) {
  // Filter competitions based on search query
  const filteredCompetitions = competitions.filter((comp) => {
    const query = searchQuery.toLowerCase();
    return (
      comp.title.toLowerCase().includes(query) ||
      comp.category.toLowerCase().includes(query) ||
      comp.author.toLowerCase().includes(query) ||
      comp.description.toLowerCase().includes(query)
    );
  });

  return (
    <main className={`min-h-screen transition-colors duration-200 ${
      darkMode ? 'bg-gray-900' : 'bg-white'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Section Title */}
        <h2 className={`text-4xl font-bold mb-10 tracking-tight ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Competitions
        </h2>

        {/* Competitions Grid */}
        {filteredCompetitions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCompetitions.map((competition) => (
              <div
                key={competition.id}
                className={`group rounded-lg overflow-hidden border transition-all duration-200 hover:shadow-lg hover:-translate-y-1 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Image */}
                <div className={`relative w-full h-48 overflow-hidden ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`}>
                  <img
                    src={competition.image}
                    alt={competition.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.target.src = 'https://via.placeholder.com/800x400?text=Competition';
                    }}
                  />
                </div>

                {/* Content */}
                <div className="p-6">
                  {/* Category */}
                  <p className={`text-xs font-medium uppercase tracking-wide mb-2 ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {competition.category}
                  </p>

                  {/* Title */}
                  <h3 className={`text-xl font-semibold mb-3 leading-tight ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {competition.title}
                  </h3>

                  {/* Description */}
                  <p className={`text-sm mb-4 leading-relaxed ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {competition.description}
                  </p>

                  {/* Author */}
                  <div className={`flex items-center text-sm ${
                    darkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    <User size={16} className="mr-2" />
                    <span>{competition.author}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={`text-center py-16 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}>
            <p className="text-lg">No competitions found matching your search.</p>
          </div>
        )}
      </div>
    </main>
  );
}

