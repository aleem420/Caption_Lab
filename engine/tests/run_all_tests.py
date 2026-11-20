import unittest
import sys
from pathlib import Path

# Ensure engine path is in sys.path
engine_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(engine_dir))

from tests.run_tests import TestCaptionLabPhase2Phase3
from tests.test_visual_qa import TestVisualAndAnimationQA
from tests.test_stress_and_benchmarks import TestStressAndProductionBenchmarks

def suite():
    s = unittest.TestSuite()
    loader = unittest.TestLoader()
    s.addTests(loader.loadTestsFromTestCase(TestCaptionLabPhase2Phase3))
    s.addTests(loader.loadTestsFromTestCase(TestVisualAndAnimationQA))
    s.addTests(loader.loadTestsFromTestCase(TestStressAndProductionBenchmarks))
    return s

if __name__ == "__main__":
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite())
    if not result.wasSuccessful():
        sys.exit(1)
