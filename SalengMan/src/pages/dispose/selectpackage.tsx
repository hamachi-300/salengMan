import { useState } from "react";
import "./selectpackage.css";
import { useNavigate } from "react-router-dom";

interface PackageOption {
  id: string;
  label: string;
}

function SelectPackage() {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const options: PackageOption[] = [
    { id: "general", label: "ทั่วไป" },
    { id: "premium", label: "พรีเมียม" },
    { id: "monthly", label: "รายเดือน" },
  ];

  const handleSelect = (id: string) => {
    setSelectedPackage(id);
  };

  const handleNext = () => {
    if (selectedPackage === "monthly") {
      navigate("/sell-old-item");
    } else if (selectedPackage === "general" || selectedPackage === "premium") {
      navigate("/sell-old-item-locat");
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate("/home")}>
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
          </svg>
        </button>
        <h1 className="page-title">Select Package</h1>
      </div>
      <div className="sell-content">
        <p className="section-label">Select Package</p>
        <div className="choice-container">
          {options.map((option) => (
            <div
              key={option.id}
              className={`choice-option ${selectedPackage === option.id ? "selected" : ""}`}
              onClick={() => handleSelect(option.id)}
            >
              <span className="choice-label">{option.label}</span>
              <div className="radio-circle">
                <div className="radio-dot"></div>
              </div>
            </div>
          ))}
        </div>
        <button
          className="next-btn"
          onClick={handleNext}
          disabled={!selectedPackage}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default SelectPackage;
