import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Category {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface SearchAndFilterProps {
  categories: Category[];
  onSearch: (query: string) => void;
  onCategoryFilter: (categoryId: string | null) => void;
  selectedCategory: string | null;
}

export function SearchAndFilter({
  categories,
  onSearch,
  onCategoryFilter,
  selectedCategory,
}: SearchAndFilterProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    onSearch(value);
  };

  const clearFilters = () => {
    setSearchQuery("");
    onSearch("");
    onCategoryFilter(null);
  };

  return (
    <div className="mb-8 space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowFilters(!showFilters)}
          className={showFilters ? "bg-accent" : ""}
        >
          <Filter className="h-4 w-4" />
        </Button>
        {(searchQuery || selectedCategory) && (
          <Button variant="ghost" size="icon" onClick={clearFilters}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-fade-in">
          <Badge
            variant={selectedCategory === null ? "default" : "outline"}
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => onCategoryFilter(null)}
          >
            All
          </Badge>
          {categories.map((category) => (
            <Badge
              key={category.id}
              variant={selectedCategory === category.id ? "default" : "outline"}
              className="cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                backgroundColor: selectedCategory === category.id ? category.color : undefined,
                borderColor: category.color,
                color: selectedCategory === category.id ? "white" : category.color,
              }}
              onClick={() => onCategoryFilter(category.id)}
            >
              {category.name}
            </Badge>
          ))}
        </div>
      )}

      {selectedCategory && (
        <div className="text-sm text-muted-foreground">
          Filtering by:{" "}
          <span className="font-medium">
            {categories.find((c) => c.id === selectedCategory)?.name}
          </span>
        </div>
      )}
    </div>
  );
}
